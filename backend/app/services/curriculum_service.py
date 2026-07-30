"""教材改版 + 章节服务 (模块 1)"""
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.curriculum_change import CurriculumChange
from app.models.knowledge_point import KnowledgePoint
from app.schemas.curriculum import (
    ChapterListResponse,
    ChapterWeekly,
    CurriculumChangeListItem,
    CurriculumChangeResponse,
    WeeklyChaptersResponse,
)

logger = logging.getLogger(__name__)


# === 教材改版 ===

async def list_changes(
    db: AsyncSession,
    grade: Optional[int] = None,
    subject: Optional[str] = None,
    version: Optional[str] = None,
    verified_only: bool = False,
) -> list[CurriculumChangeListItem]:
    stmt = select(CurriculumChange)
    if grade is not None:
        stmt = stmt.where(CurriculumChange.grade == grade)
    if subject:
        stmt = stmt.where(CurriculumChange.subject == subject)
    if version:
        stmt = stmt.where(CurriculumChange.version == version)
    if verified_only:
        stmt = stmt.where(CurriculumChange.verified == True)  # noqa: E712
    stmt = stmt.order_by(
        CurriculumChange.grade, CurriculumChange.subject, CurriculumChange.semester
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [
        CurriculumChangeListItem(
            id=r.id,
            grade=r.grade,
            subject=r.subject,
            version=r.version,
            semester=r.semester,
            change_count=len(r.changes or []),
            verified=r.verified,
        )
        for r in rows
    ]


async def get_change(db: AsyncSession, change_id: int) -> CurriculumChangeResponse:
    stmt = select(CurriculumChange).where(CurriculumChange.id == change_id)
    r = (await db.execute(stmt)).scalar_one_or_none()
    if r is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "CHANGE_NOT_FOUND", "message": "改版信息不存在"},
        )
    return CurriculumChangeResponse(
        id=r.id,
        grade=r.grade,
        subject=r.subject,
        version=r.version,
        semester=r.semester,
        changes=r.changes or [],
        source=r.source,
        source_url=r.source_url,
        verified=r.verified,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


# === 章节 (从 knowledge_points 推导) ===

def _chapter_sort_key(chapter: str) -> tuple:
    m = re.match(r"第([一二三四五六七八九十0-9]+)章", chapter)
    cn_to_int = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}
    if m:
        cn = m.group(1)
        if cn.isdigit():
            return (int(cn),)
        return (cn_to_int.get(cn, 99),)
    return (999,)


async def list_chapters(
    db: AsyncSession,
    grade: int,
    subject: str,
    version: str,
    semester: Optional[str] = None,
) -> ChapterListResponse:
    """列出某教材的全部章节 (从 knowledge_points 提取)"""
    stmt = select(KnowledgePoint.chapter).where(
        and_(
            KnowledgePoint.grade == grade,
            KnowledgePoint.subject == subject,
            KnowledgePoint.status == "published",
        )
    ).distinct()
    rows = (await db.execute(stmt)).scalars().all()
    chapters = sorted(set(rows), key=_chapter_sort_key)

    # 找出本学期新教材改动的章节
    new_chapters: list[str] = []
    if semester:
        change_stmt = select(CurriculumChange).where(
            and_(
                CurriculumChange.grade == grade,
                CurriculumChange.subject == subject,
                CurriculumChange.version == version,
                CurriculumChange.semester == semester,
                CurriculumChange.verified == True,  # noqa: E712
            )
        )
        changes = (await db.execute(change_stmt)).scalars().all()
        for c in changes:
            for ch in (c.changes or []):
                # ch 形如 "三年级下册(整体)" 或具体章节名
                chap = ch.get("chapter", "")
                if chap in chapters:
                    new_chapters.append(chap)

    return ChapterListResponse(
        grade=grade,
        subject=subject,
        version=version,
        semester=semester or "",
        chapters=chapters,
        new_textbook_chapters=new_chapters,
    )


# === 本周章节 ===

def _current_week_index(semester: str) -> int:
    """估算当前是学期的第几周 (1-18)

    简化: 假设学期开始 9/1 (秋) 或 2/15 (春), 18 周
    """
    now = datetime.now(timezone.utc)
    month = now.month
    if "fall" in semester or "autumn" in semester:
        # 9月1日开学
        start = datetime(now.year if month >= 8 else now.year - 1, 9, 1, tzinfo=timezone.utc)
    else:
        # 2月15日开学
        start = datetime(now.year if month >= 2 else now.year - 1, 2, 15, tzinfo=timezone.utc)
    weeks = max(1, min(18, ((now - start).days // 7) + 1))
    return weeks


async def get_weekly_chapters(
    db: AsyncSession,
    grade: int,
    subject: str,
    version: str,
    semester: str,
) -> WeeklyChaptersResponse:
    """本周要学的章节 (粗略: 平均分 18 周, 当前周对应的章节范围)"""
    chapters = await list_chapters(db, grade, subject, version, semester)
    week = _current_week_index(semester)
    if not chapters.chapters:
        return WeeklyChaptersResponse(
            grade=grade, subject=subject, version=version, semester=semester,
            week_index=week, chapters=[],
        )
    n = len(chapters.chapters)
    weeks = 18
    per_week = max(1, round(n / weeks))
    start_idx = (week - 1) * per_week
    end_idx = min(start_idx + per_week, n)
    # 兜底: 学期末了 (week 过大) 也至少给最后一章
    if start_idx >= n and n > 0:
        start_idx = n - 1
        end_idx = n
    this_week_chs = chapters.chapters[start_idx:end_idx]

    # 拿这些章节对应的知识点
    kp_stmt = select(KnowledgePoint).where(
        and_(
            KnowledgePoint.grade == grade,
            KnowledgePoint.subject == subject,
            KnowledgePoint.chapter.in_(this_week_chs),
        )
    )
    kps = (await db.execute(kp_stmt)).scalars().all()
    kp_by_ch: dict[str, list[KnowledgePoint]] = {}
    for kp in kps:
        kp_by_ch.setdefault(kp.chapter, []).append(kp)

    chapter_weeks = []
    for i, ch in enumerate(this_week_chs):
        kp_list = kp_by_ch.get(ch, [])
        video_url = next(
            (kp.video_urls[0] for kp in kp_list if kp.video_urls),
            None,
        )
        chapter_weeks.append(ChapterWeekly(
            chapter=ch,
            name=ch.split("·", 1)[-1] if "·" in ch else ch,
            week_index=week,
            knowledge_point_count=len(kp_list),
            knowledge_point_codes=[k.code for k in kp_list],
            video_url=video_url,
        ))

    # 新教材提醒
    is_new = bool(chapters.new_textbook_chapters)
    change_notice = None
    if is_new:
        change_notice = (
            f"本学期教材有更新, 共 {len(chapters.new_textbook_chapters)} 章有改动, "
            "建议优先复习"
        )

    return WeeklyChaptersResponse(
        grade=grade, subject=subject, version=version, semester=semester,
        week_index=week,
        chapters=chapter_weeks,
        is_new_textbook=is_new,
        change_notice=change_notice,
    )


__all__ = [
    "list_changes",
    "get_change",
    "list_chapters",
    "get_weekly_chapters",
]
