"""SmartEduVideo API - 真实微课查询 + 周推荐"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.family import Family
from app.schemas.common import SuccessResponse
from app.schemas.smartedu_video import (
    SmartEduVideoItem,
    SmartEduVideoListResponse,
)
from app.services.auth_service import get_current_family
from app.services.smartedu_video_service import (
    list_recommended_for_week,
    list_real_videos,
    random_real_video,
)

router = APIRouter()


@router.get("/smartedu-videos", response_model=SuccessResponse[SmartEduVideoListResponse])
async def list_smartedu_videos(
    grade: int = Query(..., ge=1, le=6),
    subject: str = Query(..., description="math/chinese/english/science"),
    version: str = Query(..., description="沪教版/人教版/... (smartedu label 也支持)"),
    semester: str = Query(..., description="2024-fall/2025-spring/2025-fall/2026-spring"),
    limit: int = Query(10, ge=1, le=50),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """列出某 (grade, subject, version, semester) 的真实微课

    - 优先按 importance desc, release_time desc 排
    - 用于 curriculum 页"本周推荐" 真实微课 (跳转 airClassroomTaskDetail 直达播放器)
    """
    videos = await list_real_videos(db, grade, subject, version, semester, limit=limit)
    items = [SmartEduVideoItem.model_validate(v) for v in videos]
    return SuccessResponse(data=SmartEduVideoListResponse(
        grade=grade, subject=subject, version=version, semester=semester,
        total=len(items), items=items,
    ))


@router.get("/smartedu-videos/recommend", response_model=SuccessResponse[SmartEduVideoListResponse])
async def get_recommended_for_week(
    grade: int = Query(..., ge=1, le=6),
    subject: str = Query(..., description="math/chinese/english/science"),
    version: str = Query(..., description="沪教版/人教版/..."),
    semester: str = Query(..., description="2024-fall/2025-spring/2025-fall/2026-spring"),
    week_index: int = Query(..., ge=1, le=20, description="学期第几周"),
    limit: int = Query(5, ge=1, le=20),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """周推荐: 该周附近的真实微课 (按 importance 排)"""
    videos = await list_recommended_for_week(
        db, grade, subject, version, semester, week_index, limit=limit
    )
    items = [SmartEduVideoItem.model_validate(v) for v in videos]
    return SuccessResponse(data=SmartEduVideoListResponse(
        grade=grade, subject=subject, version=version, semester=semester,
        week_index=week_index, total=len(items), items=items,
    ))


@router.get("/smartedu-videos/random", response_model=SuccessResponse[Optional[SmartEduVideoItem]])
async def get_random_video(
    grade: int = Query(..., ge=1, le=6),
    subject: str = Query(..., description="math/chinese/english/science"),
    version: Optional[str] = Query(None, description="可选: 沪教版/人教版/..."),
    semester: Optional[str] = Query(None, description="可选: 学期"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """随机抽一个真实微课 (dashboard 今日微课推荐用)"""
    video = await random_real_video(db, grade, subject, version, semester)
    if not video:
        return SuccessResponse(data=None)
    return SuccessResponse(data=SmartEduVideoItem.model_validate(video))
