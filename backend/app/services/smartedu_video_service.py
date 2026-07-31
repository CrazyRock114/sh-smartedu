"""SmartEduVideo 服务 - 真实微课的查询 + 周推荐"""
import random
from typing import Optional

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.smartedu_video import SmartEduVideo


async def list_real_videos(
    db: AsyncSession,
    grade: int,
    subject: str,
    version: str,
    semester: str,
    limit: int = 10,
) -> list[SmartEduVideo]:
    """列出某 (grade, subject, version, semester) 的真实微课, 按 importance + release_time 排序"""
    stmt = select(SmartEduVideo).where(
        and_(
            SmartEduVideo.grade == grade,
            SmartEduVideo.subject == subject,
            SmartEduVideo.version == version,
            SmartEduVideo.semester == semester,
        )
    ).order_by(
        SmartEduVideo.importance.desc(),
        SmartEduVideo.release_time.desc().nullslast(),
    ).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def list_recommended_for_week(
    db: AsyncSession,
    grade: int,
    subject: str,
    version: str,
    semester: str,
    week_index: int,
    limit: int = 5,
) -> list[SmartEduVideo]:
    """周推荐: 该周附近的微课 (按 importance desc + release_time desc)

    简化: 暂时按 importance 排序 (同 week 的 highest importance first)
    """
    return await list_real_videos(db, grade, subject, version, semester, limit=limit)


async def count_real_videos(
    db: AsyncSession,
    grade: Optional[int] = None,
    subject: Optional[str] = None,
) -> int:
    """统计某 grade/subject 的真实微课数"""
    stmt = select(func.count(SmartEduVideo.id))
    if grade is not None:
        stmt = stmt.where(SmartEduVideo.grade == grade)
    if subject is not None:
        stmt = stmt.where(SmartEduVideo.subject == subject)
    result = await db.execute(stmt)
    return int(result.scalar() or 0)


async def random_real_video(
    db: AsyncSession,
    grade: int,
    subject: str,
    version: Optional[str] = None,
    semester: Optional[str] = None,
) -> Optional[SmartEduVideo]:
    """随机抽一个真实微课 (用于 dashboard 今日推荐)"""
    stmt = select(SmartEduVideo).where(
        and_(
            SmartEduVideo.grade == grade,
            SmartEduVideo.subject == subject,
        )
    )
    if version:
        stmt = stmt.where(SmartEduVideo.version == version)
    if semester:
        stmt = stmt.where(SmartEduVideo.semester == semester)
    result = await db.execute(stmt.order_by(func.random()).limit(1))
    return result.scalar_one_or_none()


__all__ = [
    "list_real_videos",
    "list_recommended_for_week",
    "count_real_videos",
    "random_real_video",
]
