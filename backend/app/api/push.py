"""推送 + 锁屏 API (阶段 6, in-app only)"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.family import Family
from app.schemas.common import IdResponse, SuccessResponse
from app.schemas.push import (
    PushPreferenceResponse,
    PushPreferenceUpdate,
    PushRecordItem,
    SubscribeRequest,
    SubscribeResponse,
)
from app.services.auth_service import get_current_family
from app.services.push_service import (
    create_record,
    get_preferences,
    get_today_study_seconds,
    list_records,
    mark_all_read,
    mark_read,
    update_preferences,
)

router = APIRouter()


# === 偏好 ===

@router.get("/push/preferences", response_model=SuccessResponse[PushPreferenceResponse])
async def get_preferences_endpoint(
    family: Family = Depends(get_current_family),
):
    """获取推送 + 锁屏偏好"""
    return SuccessResponse(data=await get_preferences(family))


@router.patch("/push/preferences", response_model=SuccessResponse[PushPreferenceResponse])
async def update_preferences_endpoint(
    payload: PushPreferenceUpdate,
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """更新推送 + 锁屏偏好"""
    prefs = await update_preferences(db, family, payload)
    return SuccessResponse(data=prefs, message="已更新")


# === 订阅 (兼容 v0.2 早期 schema) ===

@router.post("/push/subscribe", response_model=SuccessResponse[SubscribeResponse])
async def subscribe_endpoint(
    payload: SubscribeRequest,
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """订阅推送 (默认 weekly, 晚上 7 点)"""
    family.push_enabled = payload.enabled
    family.push_time = payload.push_time
    await db.commit()
    await db.refresh(family)
    return SuccessResponse(
        data=SubscribeResponse(
            push_type=payload.push_type,
            push_time=payload.push_time,
            enabled=payload.enabled,
            message="已订阅",
        )
    )


@router.post("/push/unsubscribe", response_model=IdResponse)
async def unsubscribe_endpoint(
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """取消订阅"""
    family.push_enabled = False
    await db.commit()
    return IdResponse(id=str(family.id), message="已取消订阅")


# === 通知 (站内消息) ===

@router.get("/push/records", response_model=SuccessResponse[list[PushRecordItem]])
async def list_records_endpoint(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """列出推送记录 (站内通知)"""
    items = await list_records(db, family.id, unread_only=unread_only, limit=limit)
    return SuccessResponse(data=items)


@router.post("/push/records/{record_id}/read", response_model=IdResponse)
async def mark_read_endpoint(
    record_id: uuid.UUID,
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """标记单条已读"""
    ok = await mark_read(db, family.id, record_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "RECORD_NOT_FOUND", "message": "记录不存在"},
        )
    return IdResponse(id=str(record_id), message="已读")


@router.post("/push/records/read-all", response_model=IdResponse)
async def mark_all_read_endpoint(
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """全部已读"""
    n = await mark_all_read(db, family.id)
    return IdResponse(id=str(family.id), message=f"已读 {n} 条")


# === 锁屏相关 ===

@router.get("/push/lock-status")
async def lock_status_endpoint(
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """锁屏状态 (前端用来决定是否显示"夜深了"提醒)"""
    from app.services.push_service import check_lock
    used = await get_today_study_seconds(db, family.id)
    limit = family.daily_limit_minutes * 60
    reason = await check_lock(db, family, action="study")
    return SuccessResponse(
        data={
            "lock_at_night": family.lock_at_night,
            "lock_time": family.lock_time,
            "now": "21:30",  # 前端会自己比
            "used_minutes": used // 60,
            "limit_minutes": family.daily_limit_minutes,
            "is_locked": reason is not None,
            "lock_reason": reason,
        }
    )


# === 内部测试用 (管理员触发一个通知) ===

@router.post("/push/records/test", response_model=SuccessResponse[PushRecordItem])
async def create_test_record(
    content: str = "这是一条测试通知",
    push_type: str = "alert",
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """手动建一条测试通知 (开发用)"""
    rec = await create_record(
        db, family.id,
        content=content, push_type=push_type,
        push_channel="in_app",
    )
    return SuccessResponse(
        data=PushRecordItem(
            id=rec.id,
            family_id=rec.family_id,
            child_id=rec.child_id,
            push_type=rec.push_type,
            content_summary=rec.content_summary,
            sent_at=rec.sent_at,
            opened_at=rec.opened_at,
            push_channel=rec.push_channel,
        )
    )


__all__ = ["router"]
