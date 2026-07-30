"""学情分析服务 - 阶段 4

全部从 error_items 实时算 (不维护 MasteryState 表行, MVP 简化)
- 学情 dashboard: 学科掌握度 / 薄弱知识点 / 今日待复习 / 最近 7 天活动
- 错题热力图: 近 30 天每天的错题数 (按学科分桶)
- 周报: 本周新错 / 复习 / 掌握 + 单科汇总 + 亮点 + 下周重点
"""
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.error_item import ErrorItem
from app.schemas.push import SubjectSummary, WeeklyReportResponse
from app.services.child_service import get_child
from app.services.error_service import get_review_queue

logger = logging.getLogger(__name__)


# === 学科展示顺序 ===
SUBJECT_ORDER = ["math", "chinese", "english", "science"]
SUBJECT_LABELS = {
    "math": "数学",
    "chinese": "语文",
    "english": "英语",
    "science": "科学",
    "moral": "道德与法治",
    "pe": "体育",
    "art": "美术",
}


# === 学情 Dashboard ===

async def get_dashboard(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
) -> dict:
    """学情仪表盘

    返回: {
        child: {id, name, grade},
        subjects: [{subject, label, total, new, reviewing, mastered, mastery_score, by_error_type}],
        weak_points: [{code, name, chapter, error_count}],
        today_due: int,
        recent_7d: {new_errors, reviewed, mastered, active_days},
        last_updated: iso,
    }
    """
    child = await get_child(db, family_id, child_id)
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # 全部错题
    all_stmt = select(ErrorItem).where(ErrorItem.child_id == child_id)
    all_items = (await db.execute(all_stmt)).scalars().all()

    # 按学科聚合
    subjects_data: dict[str, dict] = {}
    for s in SUBJECT_ORDER:
        subjects_data[s] = {
            "subject": s,
            "label": SUBJECT_LABELS[s],
            "total": 0,
            "new": 0,
            "reviewing": 0,
            "mastered": 0,
            "by_error_type": defaultdict(int),
        }

    for it in all_items:
        s = it.subject
        if s not in subjects_data:
            # 自动扩展 (如 moral/pe/art)
            subjects_data[s] = {
                "subject": s,
                "label": SUBJECT_LABELS.get(s, s),
                "total": 0,
                "new": 0,
                "reviewing": 0,
                "mastered": 0,
                "by_error_type": defaultdict(int),
            }
        bucket = subjects_data[s]
        bucket["total"] += 1
        bucket["by_error_type"][it.error_type] += 1
        if it.status == "new":
            bucket["new"] += 1
        elif it.status == "reviewing":
            bucket["reviewing"] += 1
        elif it.status == "mastered":
            bucket["mastered"] += 1

    # 算 mastery_score: mastered / total (没数据时返回 None/0)
    subject_list = []
    for s in SUBJECT_ORDER:
        b = subjects_data[s]
        total = b["total"]
        if total == 0:
            mastery = 0.0
        else:
            mastery = round(b["mastered"] / total, 2)
        # by_error_type 转 dict (json 序列化)
        subject_list.append({
            **b,
            "by_error_type": dict(b["by_error_type"]),
            "mastery_score": mastery,
        })
    # 加非标准学科
    for s, b in subjects_data.items():
        if s not in SUBJECT_ORDER:
            total = b["total"]
            mastery = round(b["mastered"] / total, 2) if total else 0.0
            subject_list.append({
                **b,
                "by_error_type": dict(b["by_error_type"]),
                "mastery_score": mastery,
            })

    # 薄弱知识点: 按 knowledge_point_ids 聚合, 选 error_count 最高的 5 个
    kp_counter: dict[str, int] = defaultdict(int)
    for it in all_items:
        for kp_code in (it.knowledge_point_ids or []):
            kp_counter[kp_code] += 1
    top_kps = sorted(kp_counter.items(), key=lambda x: -x[1])[:5]
    weak_points = [{"code": code, "error_count": cnt} for code, cnt in top_kps]

    # 今日待复习
    today_due = len(await get_review_queue(db, family_id, child_id, limit=1000))

    # 最近 7 天
    new_errors_7d = sum(1 for it in all_items if it.created_at and it.created_at >= week_ago)
    reviewed_7d = sum(
        1 for it in all_items
        if it.last_reviewed_at and it.last_reviewed_at >= week_ago
    )
    mastered_7d = sum(
        1 for it in all_items
        if it.status == "mastered" and it.last_reviewed_at and it.last_reviewed_at >= week_ago
    )
    active_days = len({
        it.created_at.date()
        for it in all_items
        if it.created_at and it.created_at >= week_ago
    })

    return {
        "child": {
            "id": str(child.id),
            "name": child.name,
            "grade": child.grade,
        },
        "subjects": subject_list,
        "weak_points": weak_points,
        "today_due": today_due,
        "recent_7d": {
            "new_errors": new_errors_7d,
            "reviewed": reviewed_7d,
            "mastered": mastered_7d,
            "active_days": active_days,
        },
        "last_updated": now.isoformat(),
    }


# === 错题热力图 ===

async def get_heatmap(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
    days: int = 30,
) -> dict:
    """近 N 天每天每学科的错题数 (日历热力图用)

    返回: {
        days: N,
        start_date: YYYY-MM-DD,
        end_date: YYYY-MM-DD,
        cells: [{date, by_subject: {math: 2, chinese: 1, ...}, total: 3}],
        max_per_day: int (用于前端色阶),
    }
    """
    await get_child(db, family_id, child_id)
    now = datetime.now(timezone.utc)
    today = now.date()
    start = today - timedelta(days=days - 1)

    stmt = select(ErrorItem).where(
        and_(
            ErrorItem.child_id == child_id,
            ErrorItem.created_at >= datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc),
        )
    )
    items = (await db.execute(stmt)).scalars().all()

    # 初始化每天每学科的 0
    cells_dict: dict[str, dict[str, int]] = {}
    for d in range(days):
        date = start + timedelta(days=d)
        cells_dict[date.isoformat()] = defaultdict(int)

    for it in items:
        if not it.created_at:
            continue
        d = it.created_at.astimezone(timezone.utc).date()
        if d < start or d > today:
            continue
        cells_dict[d.isoformat()][it.subject] += 1

    cells = []
    max_per_day = 0
    for date_iso, by_subj in cells_dict.items():
        total = sum(by_subj.values())
        max_per_day = max(max_per_day, total)
        cells.append({
            "date": date_iso,
            "by_subject": dict(by_subj),
            "total": total,
        })
    cells.sort(key=lambda c: c["date"])

    return {
        "days": days,
        "start_date": start.isoformat(),
        "end_date": today.isoformat(),
        "cells": cells,
        "max_per_day": max_per_day,
    }


# === 周报 ===

def _week_range(any_day: datetime) -> tuple[datetime, datetime]:
    """返回某天所在自然周的 (周一 00:00, 下周一 00:00) UTC"""
    # 周一 = 0 ... 周日 = 6
    weekday = any_day.weekday()
    monday_date = any_day.date() - timedelta(days=weekday)
    monday = datetime.combine(monday_date, datetime.min.time(), tzinfo=timezone.utc)
    next_monday = monday + timedelta(days=7)
    return monday, next_monday


async def get_weekly_report(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: Optional[uuid.UUID] = None,
    week_start: Optional[datetime] = None,
) -> WeeklyReportResponse:
    """周报 (MVP 简化: 不算 total_study_minutes, 没有 study_records 数据)"""
    if week_start is None:
        # 默认上周 (更稳, 给家长留回顾时间)
        last_week_now = datetime.now(timezone.utc) - timedelta(days=7)
        week_start, week_end = _week_range(last_week_now)
    else:
        week_start, week_end = _week_range(week_start)

    # 拿所有错题, 在内存里按周过滤 (MVP 数据量小, OK)
    if child_id is not None:
        await get_child(db, family_id, child_id)
        all_stmt = select(ErrorItem).where(ErrorItem.child_id == child_id)
    else:
        # 家庭全部孩子
        from app.models.child import Child
        children_stmt = select(Child).where(Child.family_id == family_id)
        children = (await db.execute(children_stmt)).scalars().all()
        child_ids = [c.id for c in children]
        if not child_ids:
            # 没孩子, 返回空周报
            return _empty_weekly_report(family_id, child_id, week_start, week_end)
        all_stmt = select(ErrorItem).where(ErrorItem.child_id.in_(child_ids))
    all_items = (await db.execute(all_stmt)).scalars().all()

    new_errors = sum(1 for it in all_items if it.created_at and week_start <= it.created_at < week_end)
    mastered = sum(
        1 for it in all_items
        if it.status == "mastered" and it.last_reviewed_at and week_start <= it.last_reviewed_at < week_end
    )
    # reviewed = 本周内任何有 last_reviewed_at 的题目
    reviewed = sum(
        1 for it in all_items
        if it.last_reviewed_at and week_start <= it.last_reviewed_at < week_end
    )

    # 按学科汇总
    subj_buckets: dict[str, dict] = {}
    for it in all_items:
        s = it.subject
        if s not in subj_buckets:
            subj_buckets[s] = {
                "new_errors": 0,
                "mastered": 0,
                "reviewing": 0,
                "weak_points": defaultdict(int),
            }
        b = subj_buckets[s]
        if it.created_at and week_start <= it.created_at < week_end:
            b["new_errors"] += 1
        if it.status == "mastered" and it.last_reviewed_at and week_start <= it.last_reviewed_at < week_end:
            b["mastered"] += 1
        elif it.status == "reviewing":
            b["reviewing"] += 1
        for kp in (it.knowledge_point_ids or []):
            b["weak_points"][kp] += 1

    subjects: list[SubjectSummary] = []
    for s in SUBJECT_ORDER + [x for x in subj_buckets if x not in SUBJECT_ORDER]:
        if s not in subj_buckets:
            continue
        b = subj_buckets[s]
        weak = sorted(b["weak_points"].items(), key=lambda x: -x[1])[:3]
        weak_codes = [c for c, _ in weak]
        suggestion = _build_suggestion(s, b["new_errors"], b["mastered"], b["reviewing"], len(weak_codes))
        subjects.append(SubjectSummary(
            subject=s,
            new_errors=b["new_errors"],
            mastered=b["mastered"],
            reviewing=b["reviewing"],
            weak_points=weak_codes,
            suggestion=suggestion,
        ))

    # 亮点 + 下周重点
    highlights = []
    next_week_focus = []
    if new_errors == 0 and mastered > 0:
        highlights.append(f"本周没有新错题, 掌握了 {mastered} 道 ✓")
    elif mastered > 0:
        highlights.append(f"本周掌握 {mastered} 道错题")
    if new_errors > 0:
        highlights.append(f"本周录入 {new_errors} 道新错题")
    if reviewed > 0:
        highlights.append(f"本周复习了 {reviewed} 次")

    # 找出本周 top 3 薄弱 (用最近 30 天的)
    kp_30d: dict[str, int] = defaultdict(int)
    month_ago = week_start - timedelta(days=30)
    for it in all_items:
        if it.created_at and it.created_at >= month_ago and it.created_at < week_end:
            for kp in (it.knowledge_point_ids or []):
                kp_30d[kp] += 1
    top_weak = sorted(kp_30d.items(), key=lambda x: -x[1])[:3]
    next_week_focus = [f"重点复习: {code} (近期错 {cnt} 次)" for code, cnt in top_weak]

    if not highlights:
        highlights = ["本周无活动 · 明天试试录一道错题吧"]

    return WeeklyReportResponse(
        family_id=family_id,
        child_id=child_id,
        week_start=week_start,
        week_end=week_end,
        total_study_minutes=0,  # MVP 暂无 study_records
        total_new_errors=new_errors,
        total_reviewed=reviewed,
        total_mastered=mastered,
        subjects=subjects,
        highlights=highlights,
        next_week_focus=next_week_focus,
    )


def _empty_weekly_report(
    family_id: uuid.UUID, child_id: Optional[uuid.UUID],
    week_start: datetime, week_end: datetime,
) -> WeeklyReportResponse:
    return WeeklyReportResponse(
        family_id=family_id,
        child_id=child_id,
        week_start=week_start,
        week_end=week_end,
        total_study_minutes=0,
        total_new_errors=0,
        total_reviewed=0,
        total_mastered=0,
        subjects=[],
        highlights=["还没添加孩子 · 先加一个开始吧"],
        next_week_focus=[],
    )


def _build_suggestion(subject: str, new: int, mastered: int, reviewing: int, weak_n: int) -> Optional[str]:
    """生成家长可读的本周建议"""
    if new == 0 and mastered == 0 and reviewing == 0:
        return None
    if new > 5:
        return f"本周新错 {new} 道有点多, 建议明天集中复习 1-2 道同类型"
    if weak_n >= 3:
        return f"发现 {weak_n} 个薄弱点, 建议看 basic.sh.smartedu.cn 对应微课"
    if mastered > 0 and new == 0:
        return f"掌握得很好 ({mastered} 道), 继续保持"
    if reviewing > 0:
        return f"还有 {reviewing} 道在复习中, 别忘了按时点开"
    return None


__all__ = [
    "get_dashboard",
    "get_heatmap",
    "get_weekly_report",
]
