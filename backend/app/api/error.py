"""错题 API

路由顺序注意: 字面量路由 (review-queue / stats / suggest-type / ocr) 必须在参数化路由
/errors/{error_id} 之前注册, 否则会被 {error_id} 抢先匹配。
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.family import Family
from app.models.error_item import ERROR_TYPES
from app.schemas.common import IdResponse, SuccessResponse
from app.schemas.error import (
    ErrorItemCreate,
    ErrorItemListItem,
    ErrorItemResponse,
    ErrorItemUpdate,
    ErrorStats,
    OcrExtractResponse,
    ReviewQueueItem,
    SuggestRequest,
    SuggestResponse,
)
from app.services.attribution import ERROR_TYPE_LABELS, suggest_error_type
from app.services.auth_service import get_current_family
from app.services.error_service import (
    create_error,
    delete_error,
    get_error_response,
    get_review_queue,
    get_stats,
    list_errors,
    submit_review,
    update_error,
)
from app.services.ocr import is_available as ocr_available, ocr_and_attribute
from app.services.push_service import check_lock, create_record

router = APIRouter()


# === 字面量路由 (必须在 /{error_id} 之前) ===

@router.get("/errors/review-queue", response_model=SuccessResponse[list[ReviewQueueItem]])
async def get_review_queue_endpoint(
    child_id: uuid.UUID = Query(...),
    limit: int = Query(10, ge=1, le=50),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """待复习队列"""
    items = await get_review_queue(db, family.id, child_id, limit=limit)
    return SuccessResponse(data=items)


@router.get("/errors/stats", response_model=SuccessResponse[ErrorStats])
async def get_stats_endpoint(
    child_id: uuid.UUID = Query(...),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """错题统计 (按学科/错因/状态/due_today)"""
    stats = await get_stats(db, family.id, child_id)
    return SuccessResponse(data=stats)


@router.post("/errors/suggest-type", response_model=SuccessResponse[SuggestResponse])
async def suggest_error_type_endpoint(
    payload: SuggestRequest,
    family: Family = Depends(get_current_family),  # 必须登录
):
    """录入前先看归因建议 (不写库, 纯推断)"""
    et, reason, source_tag = await suggest_error_type(
        question=payload.question,
        correct_answer=payload.correct_answer,
        student_answer=payload.student_answer,
        note=payload.note,
    )
    return SuccessResponse(
        data=SuggestResponse(
            error_type=et,
            reason=reason,
            source=source_tag,
            labels=ERROR_TYPE_LABELS,
        )
    )


# 5MB 上限 (拍照原图 1-3MB, 余量给手抖多拍)
_MAX_OCR_BYTES = 5 * 1024 * 1024


@router.post("/errors/ocr", response_model=SuccessResponse[OcrExtractResponse])
async def ocr_error_image_endpoint(
    image: UploadFile = File(..., description="错题照片 (jpg/png/webp, ≤5MB)"),
    subject: Optional[str] = Form(None, description="学科提示 (math/chinese/english/science)"),
    family: Family = Depends(get_current_family),
):
    """拍照识题: 一跳同时拿到题目 + 学生答案 + AI 错因。

    依赖: 配 ZHIPUAI_API_KEY (智谱 GLM-4V 多模态)。未配时返回 503, 让前端降级到手动录入。
    """
    if not ocr_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "OCR_UNAVAILABLE",
                "message": "拍照识别需要配 ZHIPUAI_API_KEY (智谱 GLM-4V)。请在 .env 配好后重启, 或手动录入。",
            },
        )

    contents = await image.read()
    if len(contents) > _MAX_OCR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"error": "IMAGE_TOO_LARGE", "message": f"图片 {len(contents)//1024}KB 超过 5MB 上限"},
        )
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "EMPTY_IMAGE", "message": "没收到图片数据"},
        )

    mime = image.content_type or "image/jpeg"
    if mime not in ("image/jpeg", "image/png", "image/webp", "image/jpg"):
        # 容错: 浏览器有时给 octet-stream
        mime = "image/jpeg"

    result = await ocr_and_attribute(contents, image_mime=mime, hint_subject=subject)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": "OCR_FAILED", "message": "AI 识别失败, 请检查图片清晰度或手动录入"},
        )

    return SuccessResponse(
        data=OcrExtractResponse(
            question_text=result["question_text"],
            student_answer=result["student_answer"],
            error_type=result["error_type"],
            reason=result["reason"],
            source=result["source"],
            labels=ERROR_TYPE_LABELS,
        )
    )


# === CRUD ===

@router.get("/errors", response_model=SuccessResponse[list[ErrorItemListItem]])
async def list_errors_endpoint(
    child_id: uuid.UUID = Query(..., description="孩子 ID"),
    subject: Optional[str] = Query(None, description="按学科过滤"),
    error_type: Optional[str] = Query(None, description="按错因过滤"),
    status_filter: Optional[str] = Query(None, alias="status", description="new/reviewing/mastered/archived"),
    include_archived: bool = Query(False, description="包含已 mastered/archived"),
    limit: int = Query(50, ge=1, le=200),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """列出孩子的错题 (默认排除 mastered/archived)"""
    items = await list_errors(
        db,
        family.id,
        child_id,
        subject=subject,
        error_type=error_type,
        status_filter=status_filter,
        include_archived=include_archived,
        limit=limit,
    )
    return SuccessResponse(data=items)


@router.post(
    "/errors",
    response_model=SuccessResponse[ErrorItemResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_error_endpoint(
    payload: ErrorItemCreate,
    child_id: uuid.UUID = Query(..., description="孩子 ID"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """录入错题 (手动 / OCR 文字)"""
    # 锁屏检查 (阶段 6)
    lock_reason = await check_lock(db, family, action="study")
    if lock_reason:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "NIGHT_LOCK", "message": lock_reason},
        )

    item = await create_error(db, family.id, child_id, payload)

    # 录入后自动推一条 alert (in-app)
    if family.push_enabled:
        await create_record(
            db, family.id,
            content=f"已录错题: {item.question_text[:30]} · 错因 {item.error_type}",
            push_type="alert",
            child_id=child_id,
            push_channel="in_app",
        )

    return SuccessResponse(data=item, message="录入成功")


@router.get("/errors/{error_id}", response_model=SuccessResponse[ErrorItemResponse])
async def get_error_endpoint(
    error_id: uuid.UUID,
    child_id: uuid.UUID = Query(..., description="孩子 ID"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """错题详情"""
    item = await get_error_response(db, family.id, child_id, error_id)
    return SuccessResponse(data=item)


@router.patch("/errors/{error_id}", response_model=SuccessResponse[ErrorItemResponse])
async def update_error_endpoint(
    error_id: uuid.UUID,
    payload: ErrorItemUpdate,
    child_id: uuid.UUID = Query(..., description="孩子 ID"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """更新错题 (改归因/补知识点/修正答案)"""
    item = await update_error(db, family.id, child_id, error_id, payload)
    return SuccessResponse(data=item, message="已更新")


@router.delete("/errors/{error_id}", response_model=IdResponse)
async def delete_error_endpoint(
    error_id: uuid.UUID,
    child_id: uuid.UUID = Query(..., description="孩子 ID"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """删除错题 (硬删)"""
    await delete_error(db, family.id, child_id, error_id)
    return IdResponse(id=str(error_id), message="已删除")


@router.post(
    "/errors/{error_id}/review",
    response_model=SuccessResponse[ErrorItemResponse],
)
async def submit_review_endpoint(
    error_id: uuid.UUID,
    result: str = Query(..., description="correct / wrong / skip"),
    child_id: uuid.UUID = Query(...),
    time_spent_seconds: Optional[int] = Query(None, ge=0),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """提交复习结果"""
    if result not in {"correct", "wrong", "skip"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_RESULT", "message": "result 必须是 correct/wrong/skip"},
        )

    # 锁屏检查 (阶段 6)
    lock_reason = await check_lock(db, family, action="review")
    if lock_reason:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "NIGHT_LOCK", "message": lock_reason},
        )

    item = await submit_review(db, family.id, child_id, error_id, result)

    # 答对 6 次标 mastered 时推一条
    if item.status == "mastered" and family.push_enabled:
        await create_record(
            db, family.id,
            content=f"🎉 掌握了一道错题: {item.question_text[:30]}",
            push_type="alert",
            child_id=child_id,
            push_channel="in_app",
        )

    return SuccessResponse(data=item, message="已记录")


__all__ = ["router", "ERROR_TYPES"]
