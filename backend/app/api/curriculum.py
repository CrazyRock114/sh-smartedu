"""教材改版 + 章节 API (模块 1)"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.family import Family
from app.schemas.common import SuccessResponse
from app.schemas.curriculum import (
    ChapterListResponse,
    CurriculumChangeListItem,
    CurriculumChangeResponse,
    WeeklyChaptersResponse,
)
from app.services.auth_service import get_current_family
from app.services.curriculum_service import (
    get_change,
    get_weekly_chapters,
    list_changes,
    list_chapters,
)

router = APIRouter()


@router.get("/curriculum/changes", response_model=SuccessResponse[list[CurriculumChangeListItem]])
async def list_changes_endpoint(
    grade: Optional[int] = Query(None, ge=1, le=6),
    subject: Optional[str] = Query(None),
    version: Optional[str] = Query(None),
    verified_only: bool = Query(False, description="只看已确认的"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """列出教材改版信息"""
    items = await list_changes(
        db, grade=grade, subject=subject, version=version, verified_only=verified_only
    )
    return SuccessResponse(data=items)


@router.get("/curriculum/changes/{change_id}", response_model=SuccessResponse[CurriculumChangeResponse])
async def get_change_endpoint(
    change_id: int,
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """改版详情"""
    item = await get_change(db, change_id)
    return SuccessResponse(data=item)


@router.get("/curriculum/chapters", response_model=SuccessResponse[ChapterListResponse])
async def list_chapters_endpoint(
    grade: int = Query(..., ge=1, le=6),
    subject: str = Query(...),
    version: str = Query(...),
    semester: Optional[str] = Query(None, description="2024-fall / 2025-spring"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """列出某教材的全部章节 (从知识图谱推导)"""
    data = await list_chapters(db, grade, subject, version, semester)
    return SuccessResponse(data=data)


@router.get("/curriculum/weekly", response_model=SuccessResponse[WeeklyChaptersResponse])
async def weekly_endpoint(
    grade: int = Query(..., ge=1, le=6),
    subject: str = Query(...),
    version: str = Query(...),
    semester: str = Query(..., description="2024-fall / 2025-spring"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """本周要学的章节 (按学期周数推算)"""
    data = await get_weekly_chapters(db, grade, subject, version, semester)
    return SuccessResponse(data=data)


__all__ = ["router"]
