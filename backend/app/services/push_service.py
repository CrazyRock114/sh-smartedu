"""推送 + 锁屏服务 (阶段 6, in-app only)

推送通道: 微信扫码不做, 走 in-app (站内通知) + email (可选, 后续)
锁屏: Web 端无法真锁设备, 用服务端检查:
- 现在时间在 lock_time ± 1h 内, 且今天 study_seconds > daily_limit_minutes * 60 → 拒绝"学习类"操作
- 改成 "夜深了, 明天再学" 友好提示
"""
import logging
import uuid
from datetime import datetime, time, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.error_item import ErrorItem
from app.models.family import Family
from app.models.push_record import PushRecord
from app.schemas.push import PushPreferenceResponse, PushPreferenceUpdate, PushRecordItem

logger = logging.getLogger(__name__)


# === 推送偏好 ===

async def get_preferences(family: Family) -> PushPreferenceResponse:
    return PushPreferenceResponse(
        push_enabled=family.push_enabled,
        push_time=family.push_time,
        daily_limit_minutes=family.daily_limit_minutes,
        lock_at_night=family.lock_at_night,
        lock_time=family.lock_time,
    )


async def update_preferences(
    db: AsyncSession,
    family: Family,
    payload: PushPreferenceUpdate,
) -> PushPreferenceResponse:
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(family, k, v)
    await db.commit()
    await db.refresh(family)
    logger.info(f"family {family.id} updated push preferences: {update_data}")
    return await get_preferences(family)


# === 推送记录 (站内通知) ===

async def list_records(
    db: AsyncSession,
    family_id: uuid.UUID,
    *,
    unread_only: bool = False,
    limit: int = 50,
) -> list[PushRecordItem]:
    stmt = select(PushRecord).where(PushRecord.family_id == family_id)
    if unread_only:
        stmt = stmt.where(PushRecord.opened_at.is_(None))
    stmt = stmt.order_by(PushRecord.sent_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        PushRecordItem(
            id=r.id,
            family_id=r.family_id,
            child_id=r.child_id,
            push_type=r.push_type,
            content_summary=r.content_summary,
            sent_at=r.sent_at,
            opened_at=r.opened_at,
            push_channel=r.push_channel,
        )
        for r in rows
    ]


async def mark_read(
    db: AsyncSession,
    family_id: uuid.UUID,
    record_id: uuid.UUID,
) -> bool:
    stmt = select(PushRecord).where(
        and_(PushRecord.id == record_id, PushRecord.family_id == family_id)
    )
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if rec is None:
        return False
    if rec.opened_at is None:
        rec.opened_at = datetime.now(timezone.utc)
        await db.commit()
    return True


async def mark_all_read(db: AsyncSession, family_id: uuid.UUID) -> int:
    now = datetime.now(timezone.utc)
    stmt = select(PushRecord).where(
        and_(PushRecord.family_id == family_id, PushRecord.opened_at.is_(None))
    )
    rows = (await db.execute(stmt)).scalars().all()
    for r in rows:
        r.opened_at = now
    await db.commit()
    return len(rows)


async def create_record(
    db: AsyncSession,
    family_id: uuid.UUID,
    *,
    content: str,
    push_type: str = "alert",
    child_id: Optional[uuid.UUID] = None,
    push_channel: str = "in_app",
) -> PushRecord:
    """内部用: 别的 service 触发推送时调这个"""
    rec = PushRecord(
        id=uuid.uuid4(),
        family_id=family_id,
        child_id=child_id,
        push_type=push_type,
        content_summary=content,
        sent_at=datetime.now(timezone.utc),
        push_channel=push_channel,
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


# === 锁屏检查 ===

def _parse_hhmm(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


async def get_today_study_seconds(
    db: AsyncSession,
    family_id: uuid.UUID,
) -> int:
    """今天的学习秒数 (粗估: 错题录入 + 复习 都算 60 秒)

    MVP 简化: 不真做 timer, 拿交互次数 × 估算值
    """
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    # 拿家庭所有孩子
    from app.models.child import Child
    child_ids = (
        await db.execute(
            select(Child.id).where(Child.family_id == family_id)
        )
    ).scalars().all()
    if not child_ids:
        return 0
    # 错题录入
    err_count = (
        await db.execute(
            select(func.count(ErrorItem.id)).where(
                and_(
                    ErrorItem.child_id.in_(child_ids),
                    ErrorItem.created_at >= today_start,
                )
            )
        )
    ).scalar_one()
    # 复习次数
    rev_count = (
        await db.execute(
            select(func.count(ErrorItem.id)).where(
                and_(
                    ErrorItem.child_id.in_(child_ids),
                    ErrorItem.last_reviewed_at >= today_start,
                )
            )
        )
    ).scalar_one()
    return (err_count + rev_count) * 60


def is_in_lock_window(now: datetime, lock_time_str: str) -> bool:
    """是否在 lock_time 之后 (22 点后到 24 点)"""
    lock_t = _parse_hhmm(lock_time_str)
    return now.time() >= lock_t


async def check_lock(
    db: AsyncSession,
    family: Family,
    *,
    action: str = "study",
) -> Optional[str]:
    """锁屏检查, 返回锁定原因 / None (没锁)

    触发条件 (all):
    1. family.lock_at_night == True
    2. 当前时间 >= lock_time (e.g. 21:00)
    3. 今日 study_seconds > daily_limit_minutes * 60 (即超今日时长)

    满足 → 阻止学习类操作, 友好提示
    """
    if not family.lock_at_night:
        return None
    now = datetime.now(timezone.utc)
    if not is_in_lock_window(now, family.lock_time):
        return None
    used = await get_today_study_seconds(db, family.id)
    limit = family.daily_limit_minutes * 60
    if used > limit:
        return (
            f"夜深了 ({family.lock_time} 后) · 今天已用 {used // 60} 分钟, "
            f"超过 {family.daily_limit_minutes} 分钟上限, 明天 {family.lock_time[:2]} 点前休息吧 🌙"
        )
    return None


def enforce_lock_or_403(
    db: AsyncSession, family: Family, action: str = "study"
):
    """锁屏硬阻拦 (FastAPI 依赖里用)"""
    reason_holder = {"reason": None}

    async def _check():
        reason_holder["reason"] = await check_lock(db, family, action=action)

    # 同步运行 (check_lock 内部 await, 简单做法是直接调用)
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # 已经在 event loop 里: 后续由 caller await
            return None
        reason = loop.run_until_complete(_check())
    except RuntimeError:
        reason = asyncio.run(_check())
    if reason_holder["reason"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "NIGHT_LOCK", "message": reason_holder["reason"]},
        )


__all__ = [
    "get_preferences",
    "update_preferences",
    "list_records",
    "mark_read",
    "mark_all_read",
    "create_record",
    "check_lock",
    "get_today_study_seconds",
]
