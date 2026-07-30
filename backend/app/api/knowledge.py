"""知识图谱 API (阶段 5)"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.family import Family
from app.schemas.common import SuccessResponse
from app.schemas.knowledge import (
    ChapterInfo,
    KnowledgeGraphResponse,
    KnowledgePointListItem,
    KnowledgePointResponse,
)
from app.services.auth_service import get_current_family
from app.services.knowledge_service import (
    get_chapters,
    get_knowledge_graph,
    get_knowledge_point_response,
    list_knowledge_points,
)

router = APIRouter()


@router.get("/knowledge/points", response_model=SuccessResponse[list[KnowledgePointListItem]])
async def list_kp_endpoint(
    subject: Optional[str] = Query(None),
    grade: Optional[int] = Query(None, ge=1, le=6),
    chapter: Optional[str] = Query(None),
    family: Family = Depends(get_current_family),  # 登录即可
    db: AsyncSession = Depends(get_db),
):
    """列出知识点 (按学科/年级/章节筛)"""
    items = await list_knowledge_points(db, subject=subject, grade=grade, chapter=chapter)
    return SuccessResponse(data=items)


@router.get("/knowledge/points/{code}", response_model=SuccessResponse[KnowledgePointResponse])
async def get_kp_endpoint(
    code: str,
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """知识点详情"""
    item = await get_knowledge_point_response(db, code)
    return SuccessResponse(data=item)


@router.get("/knowledge/graph", response_model=SuccessResponse[KnowledgeGraphResponse])
async def get_graph_endpoint(
    subject: str = Query(...),
    grade: int = Query(..., ge=1, le=6),
    child_id: Optional[uuid.UUID] = Query(None, description="孩子 ID (带掌握度)"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """知识图谱 (节点 + 边 + 孩子掌握度)"""
    graph = await get_knowledge_graph(db, subject, grade, child_id=child_id)
    return SuccessResponse(data=graph)


@router.get("/knowledge/chapters", response_model=SuccessResponse[list[ChapterInfo]])
async def get_chapters_endpoint(
    subject: str = Query(...),
    grade: int = Query(..., ge=1, le=6),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """按章节聚合的知识点 (前端可按章节列表)"""
    chapters = await get_chapters(db, subject, grade)
    return SuccessResponse(data=chapters)


__all__ = ["router"]
