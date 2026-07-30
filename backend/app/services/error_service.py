"""ErrorItem service - 错题 CRUD + 复习 + 归因

数据流:
1. 录入 (手动/OCR): 入库 → 后台调归因器(不阻塞用户) → 更新 error_type
2. 复习: 提交结果 → 更新 status / next_review_at / review_count (简单间隔: 错→1天, 对3次→3天, 对6次→7天, 标 mastered)
3. 统计: 全部 / 按学科 / 按错因 / 按状态 / due_today
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.child import Child
from app.models.error_item import ERROR_TYPES, ErrorItem
from app.models.family import Family
from app.schemas.error import (
    ErrorItemCreate,
    ErrorItemListItem,
    ErrorItemResponse,
    ErrorItemUpdate,
    ErrorStats,
    ReviewQueueItem,
)
from app.services.attribution import label_for, suggest_error_type
from app.services.child_service import get_child

logger = logging.getLogger(__name__)


# === 转换 ===

def _to_response(item: ErrorItem) -> ErrorItemResponse:
    return ErrorItemResponse(
        id=item.id,
        child_id=item.child_id,
        subject=item.subject,
        knowledge_point_ids=list(item.knowledge_point_ids or []),
        question_text=item.question_text,
        question_image_url=item.question_image_url,
        correct_answer=item.correct_answer,
        student_answer=item.student_answer,
        error_type=item.error_type,
        error_note=item.error_note,
        source=item.source,
        source_note=item.source_note,
        status=item.status,
        next_review_at=item.next_review_at,
        review_count=item.review_count,
        last_reviewed_at=item.last_reviewed_at,
        last_review_correct=item.last_review_correct,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _to_list_item(item: ErrorItem) -> ErrorItemListItem:
    preview = item.question_text[:50]
    if len(item.question_text) > 50:
        preview += "…"
    return ErrorItemListItem(
        id=item.id,
        child_id=item.child_id,
        subject=item.subject,
        error_type=item.error_type,
        status=item.status,
        next_review_at=item.next_review_at,
        review_count=item.review_count,
        question_preview=preview,
        created_at=item.created_at,
    )


# === CRUD ===

async def list_errors(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
    *,
    subject: Optional[str] = None,
    error_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    include_archived: bool = False,
    limit: int = 50,
) -> list[ErrorItemListItem]:
    """列出孩子的错题 (按创建时间倒序)"""
    # 校验归属
    await get_child(db, family_id, child_id)

    stmt = select(ErrorItem).where(ErrorItem.child_id == child_id)
    if subject:
        stmt = stmt.where(ErrorItem.subject == subject)
    if error_type:
        stmt = stmt.where(ErrorItem.error_type == error_type)
    if status_filter:
        stmt = stmt.where(ErrorItem.status == status_filter)
    elif not include_archived:
        # 默认排除已 mastered 和 archived
        stmt = stmt.where(ErrorItem.status.in_(["new", "reviewing"]))
    stmt = stmt.order_by(ErrorItem.created_at.desc()).limit(limit)

    result = await db.execute(stmt)
    return [_to_list_item(i) for i in result.scalars().all()]


async def get_error(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
    error_id: uuid.UUID,
) -> ErrorItem:
    """获取单个错题, 校验归属"""
    await get_child(db, family_id, child_id)

    stmt = select(ErrorItem).where(
        and_(ErrorItem.id == error_id, ErrorItem.child_id == child_id)
    )
    item = (await db.execute(stmt)).scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "ERROR_NOT_FOUND", "message": "错题不存在或不属于此孩子"},
        )
    return item


async def get_error_response(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
    error_id: uuid.UUID,
) -> ErrorItemResponse:
    item = await get_error(db, family_id, child_id, error_id)
    return _to_response(item)


async def create_error(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
    payload: ErrorItemCreate,
) -> ErrorItemResponse:
    """录入错题 (手动 / OCR 文字)

    自动跑归因器 (异步, 不阻塞): 写库用规则版, GLM 拿到结果再更新。
    MVP 简化: 同步用规则版, GLM 当"软建议"通过 source_note 写入, 家长可改。
    """
    await get_child(db, family_id, child_id)

    # 自动归因 (同步, 简单规则版, GLM 异步)
    et, reason, source_tag = await suggest_error_type(
        question=payload.question_text,
        correct_answer=payload.correct_answer,
        student_answer=payload.student_answer,
        note=payload.error_note,
    )
    # 用归因建议, 但 payload 里如果已经填了 error_type, 尊重家长的选择
    if not payload.error_type or payload.error_type == "OTHER":
        chosen_et = et
        chosen_source_note = f"{source_tag}: {reason}" if reason else None
    else:
        chosen_et = payload.error_type
        chosen_source_note = payload.source_note

    item = ErrorItem(
        id=uuid.uuid4(),
        child_id=child_id,
        subject=payload.subject,
        knowledge_point_ids=payload.knowledge_point_ids or [],
        question_text=payload.question_text,
        question_image_url=payload.question_image_url,
        correct_answer=payload.correct_answer,
        student_answer=payload.student_answer,
        error_type=chosen_et,
        error_note=payload.error_note,
        source=payload.source,
        source_note=chosen_source_note,
        status="new",
        next_review_at=None,  # 第一次入册, 不强制今天复习
        review_count=0,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    logger.info(
        f"error created: {item.id} (child={child_id}, et={chosen_et}, suggest={et} via {source_tag})"
    )
    return _to_response(item)


async def update_error(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
    error_id: uuid.UUID,
    payload: ErrorItemUpdate,
) -> ErrorItemResponse:
    """更新错题 (家长改归因/补充知识点/修正题目)"""
    item = await get_error(db, family_id, child_id, error_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    logger.info(f"error updated: {item.id} by family {family_id}")
    return _to_response(item)


async def delete_error(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
    error_id: uuid.UUID,
) -> bool:
    """删除错题 (硬删, 错题本不像孩子档案需要保留历史)"""
    item = await get_error(db, family_id, child_id, error_id)
    await db.delete(item)
    await db.commit()
    logger.info(f"error deleted: {error_id} by family {family_id}")
    return True


# === 复习 ===

# 简单间隔: 错 → 1 天, 二次对 → 3 天, 3 次对 → 7 天, 6 次对 → mastered
_REVIEW_INTERVALS_DAYS = [1, 1, 3, 3, 7, 7, 14, 14, 30]
_MASTERED_AFTER_N_CORRECT = 6


def _next_review_at(correct_count: int, last_correct: bool) -> tuple[Optional[datetime], str]:
    """根据"连续答对次数 + 上次是否对"算下次复习时间 + 状态"""
    if not last_correct:
        # 答错了, 重置连续对次数
        return datetime.now(timezone.utc) + timedelta(days=1), "reviewing"
    # 答对了
    new_correct_count = correct_count + 1
    if new_correct_count >= _MASTERED_AFTER_N_CORRECT:
        return None, "mastered"
    days = _REVIEW_INTERVALS_DAYS[min(new_correct_count, len(_REVIEW_INTERVALS_DAYS) - 1)]
    return datetime.now(timezone.utc) + timedelta(days=days), "reviewing"


async def submit_review(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
    error_id: uuid.UUID,
    result: str,
) -> ErrorItemResponse:
    """提交一次复习结果

    - correct: 累计连续对次数, 推下次时间, 够 6 次标 mastered
    - wrong: 重置累计, 1 天后再复习
    - skip: 不改状态 (家长跳过)
    """
    item = await get_error(db, family_id, child_id, error_id)

    now = datetime.now(timezone.utc)
    last_correct = (result == "correct")

    if result == "skip":
        # 跳过不算对也不算错, 只更新 last_reviewed_at
        item.last_reviewed_at = now
        item.last_review_correct = None
        await db.commit()
        await db.refresh(item)
        return _to_response(item)

    # correct / wrong
    consecutive_correct = item.review_count if last_correct else 0
    # 注意: review_count 在 schema 里是"累计复习次数", 重新定义为"连续答对次数"
    # (MVP 简化, 不区分"历史总次数"和"连续对次数")
    item.review_count = consecutive_correct + 1 if last_correct else 0
    item.last_reviewed_at = now
    item.last_review_correct = last_correct

    next_at, new_status = _next_review_at(consecutive_correct, last_correct)
    item.next_review_at = next_at
    item.status = new_status

    await db.commit()
    await db.refresh(item)
    logger.info(
        f"review submitted: {item.id} result={result} → status={new_status}, next={next_at}"
    )
    return _to_response(item)


async def get_review_queue(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
    limit: int = 10,
) -> list[ReviewQueueItem]:
    """待复习队列: next_review_at <= now 或 null (新入册)

    排序: 过期最久的先
    """
    await get_child(db, family_id, child_id)

    now = datetime.now(timezone.utc)
    stmt = (
        select(ErrorItem)
        .where(
            and_(
                ErrorItem.child_id == child_id,
                ErrorItem.status.in_(["new", "reviewing"]),
            )
        )
        .order_by(ErrorItem.next_review_at.asc().nulls_first())
        .limit(limit)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    return [
        ReviewQueueItem(
            id=i.id,
            child_id=i.child_id,
            subject=i.subject,
            question_text=i.question_text,
            question_image_url=i.question_image_url,
            correct_answer=i.correct_answer,
            student_answer=i.student_answer,
            error_type=i.error_type,
            next_review_at=i.next_review_at,
            review_count=i.review_count,
            is_overdue=(i.next_review_at is not None and i.next_review_at < now),
        )
        for i in items
    ]


# === 统计 ===

async def get_stats(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
) -> ErrorStats:
    """错题统计"""
    await get_child(db, family_id, child_id)

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    end_of_today = now.replace(hour=23, minute=59, second=59, microsecond=0)

    # 总数 + 各维度计数
    all_stmt = select(ErrorItem).where(ErrorItem.child_id == child_id)
    rows = (await db.execute(all_stmt)).scalars().all()

    by_subject: dict[str, int] = {}
    by_error_type: dict[str, int] = {}
    by_status: dict[str, int] = {}
    due_today = 0
    mastered_this_week = 0

    for r in rows:
        by_subject[r.subject] = by_subject.get(r.subject, 0) + 1
        by_error_type[r.error_type] = by_error_type.get(r.error_type, 0) + 1
        by_status[r.status] = by_status.get(r.status, 0) + 1
        if r.status in ("new", "reviewing"):
            if r.next_review_at is None or r.next_review_at <= end_of_today:
                due_today += 1
        if r.status == "mastered" and r.last_reviewed_at and r.last_reviewed_at >= week_ago:
            mastered_this_week += 1

    return ErrorStats(
        total=len(rows),
        by_subject=by_subject,
        by_error_type=by_error_type,
        by_status=by_status,
        due_today=due_today,
        mastered_this_week=mastered_this_week,
    )


__all__ = [
    "list_errors",
    "get_error",
    "get_error_response",
    "create_error",
    "update_error",
    "delete_error",
    "submit_review",
    "get_review_queue",
    "get_stats",
    "label_for",
]
