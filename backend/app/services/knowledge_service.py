"""Knowledge graph 服务 - 阶段 5"""
import logging
import uuid
from collections import defaultdict
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.error_item import ErrorItem
from app.models.knowledge_point import KnowledgePoint
from app.schemas.knowledge import (
    ChapterInfo,
    GraphEdge,
    GraphNode,
    KnowledgeGraphResponse,
    KnowledgePointListItem,
    KnowledgePointResponse,
)

logger = logging.getLogger(__name__)


# === 章节解析 ===

def _chapter_sort_key(chapter: str) -> tuple:
    """'第N章·...' 按 N 数字排序"""
    import re
    m = re.match(r"第([一二三四五六七八九十0-9]+)章", chapter)
    if not m:
        return (999,)
    cn = m.group(1)
    cn_to_int = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}
    if cn.isdigit():
        return (int(cn),)
    return (cn_to_int.get(cn, 99),)


# === 列表 / 详情 ===

async def list_knowledge_points(
    db: AsyncSession,
    subject: Optional[str] = None,
    grade: Optional[int] = None,
    chapter: Optional[str] = None,
) -> list[KnowledgePointListItem]:
    """按学科/年级/章节筛选知识点"""
    stmt = select(KnowledgePoint).where(KnowledgePoint.status == "published")
    if subject:
        stmt = stmt.where(KnowledgePoint.subject == subject)
    if grade is not None:
        stmt = stmt.where(KnowledgePoint.grade == grade)
    if chapter:
        stmt = stmt.where(KnowledgePoint.chapter == chapter)
    stmt = stmt.order_by(KnowledgePoint.chapter, KnowledgePoint.code)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        KnowledgePointListItem(
            code=r.code,
            subject=r.subject,
            grade=r.grade,
            chapter=r.chapter,
            name=r.name,
            importance=r.importance,
            difficulty=r.difficulty,
        )
        for r in rows
    ]


async def get_knowledge_point(
    db: AsyncSession,
    code: str,
) -> KnowledgePoint:
    stmt = select(KnowledgePoint).where(KnowledgePoint.code == code)
    kp = (await db.execute(stmt)).scalar_one_or_none()
    if kp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "KP_NOT_FOUND", "message": f"知识点 {code} 不存在"},
        )
    return kp


async def get_knowledge_point_response(
    db: AsyncSession, code: str
) -> KnowledgePointResponse:
    kp = await get_knowledge_point(db, code)
    return KnowledgePointResponse(
        id=kp.id,
        code=kp.code,
        subject=kp.subject,
        grade=kp.grade,
        chapter=kp.chapter,
        name=kp.name,
        description=kp.description,
        prerequisites=list(kp.prerequisites or []),
        successors=list(kp.successors or []),
        related=list(kp.related or []),
        importance=kp.importance,
        difficulty=kp.difficulty,
        video_urls=list(kp.video_urls or []),
        common_errors=list(kp.common_errors or []),
        status=kp.status,
        created_at=kp.created_at,
        updated_at=kp.updated_at,
    )


# === 图谱 (按学科+年级, 包含孩子的掌握度) ===

async def get_knowledge_graph(
    db: AsyncSession,
    subject: str,
    grade: int,
    child_id: Optional[uuid.UUID] = None,
) -> KnowledgeGraphResponse:
    """知识图谱: 节点 + 边 + 掌握度

    掌握度计算 (实时, 不写库):
    - 错题数 = 0: mastery = 0 (未学)
    - 错题数 > 0: mastery = mastered / total_attempts
      - 简化: total_attempts = sum(1 for each error_item referencing this kp)
      - mastered = count of those with status='mastered'
    """
    stmt = select(KnowledgePoint).where(
        and_(
            KnowledgePoint.subject == subject,
            KnowledgePoint.grade == grade,
            KnowledgePoint.status == "published",
        )
    ).order_by(KnowledgePoint.chapter, KnowledgePoint.code)
    kps = (await db.execute(stmt)).scalars().all()
    kp_codes = {k.code for k in kps}

    # 算每个知识点的错题数 + mastered 数 (有 child_id 时)
    kp_error_count: dict[str, int] = defaultdict(int)
    kp_mastered: dict[str, int] = defaultdict(int)
    if child_id:
        err_stmt = select(ErrorItem).where(ErrorItem.child_id == child_id)
        errs = (await db.execute(err_stmt)).scalars().all()
        for e in errs:
            for code in (e.knowledge_point_ids or []):
                if code in kp_codes:
                    kp_error_count[code] += 1
                    if e.status == "mastered":
                        kp_mastered[code] += 1

    # 节点
    nodes: list[GraphNode] = []
    for kp in kps:
        err_n = kp_error_count.get(kp.code, 0)
        mas_n = kp_mastered.get(kp.code, 0)
        if err_n == 0:
            mastery = 0.0
        else:
            mastery = round(mas_n / err_n, 2)
        nodes.append(GraphNode(
            code=kp.code,
            name=kp.name,
            chapter=kp.chapter,
            importance=kp.importance,
            difficulty=kp.difficulty,
            mastery=mastery,
            error_count=err_n,
            has_video=len(kp.video_urls or []) > 0,
        ))

    # 边 (只画 prerequisite + successor, related 不画避免图糊)
    edges: list[GraphEdge] = []
    seen_edges: set[tuple[str, str]] = set()
    for kp in kps:
        for src in (kp.prerequisites or []):
            if src in kp_codes:
                key = (src, kp.code)
                if key not in seen_edges:
                    edges.append(GraphEdge(source=src, target=kp.code, relation="prerequisite"))
                    seen_edges.add(key)
        for tgt in (kp.successors or []):
            if tgt in kp_codes:
                key = (kp.code, tgt)
                if key not in seen_edges:
                    edges.append(GraphEdge(source=kp.code, target=tgt, relation="successor"))
                    seen_edges.add(key)

    # 汇总
    summary = {
        "total": len(nodes),
        "mastered": sum(1 for n in nodes if n.mastery >= 0.8),
        "in_progress": sum(1 for n in nodes if 0 < n.mastery < 0.8),
        "unstudied": sum(1 for n in nodes if n.error_count == 0),
        "weak": sum(1 for n in nodes if 0 < n.mastery < 0.5),
    }

    return KnowledgeGraphResponse(
        subject=subject,
        grade=grade,
        nodes=nodes,
        edges=edges,
        summary=summary,
    )


# === 章节分组 (前端用) ===

async def get_chapters(
    db: AsyncSession,
    subject: str,
    grade: int,
) -> list[ChapterInfo]:
    """按章节聚合知识点 (给"按章节刷"用)"""
    kps = await list_knowledge_points(db, subject=subject, grade=grade)
    chapters: dict[str, list[KnowledgePointListItem]] = defaultdict(list)
    for kp in kps:
        chapters[kp.chapter].append(kp)
    return [
        ChapterInfo(
            chapter=ch,
            knowledge_points=items,
            total_points=len(items),
        )
        for ch, items in sorted(chapters.items(), key=lambda x: _chapter_sort_key(x[0]))
    ]


__all__ = [
    "list_knowledge_points",
    "get_knowledge_point",
    "get_knowledge_point_response",
    "get_knowledge_graph",
    "get_chapters",
]
