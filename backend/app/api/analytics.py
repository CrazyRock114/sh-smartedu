"""学情分析 API (阶段 4)"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.family import Family
from app.schemas.common import SuccessResponse
from app.schemas.push import WeeklyReportResponse
from app.services.analytics_service import (
    get_dashboard,
    get_heatmap,
    get_weekly_report,
)
from app.services.auth_service import get_current_family

router = APIRouter()


@router.get("/analytics/dashboard")
async def dashboard_endpoint(
    child_id: uuid.UUID = Query(..., description="孩子 ID"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """学情仪表盘 (学科掌握度 + 薄弱 + 最近 7 天 + 今日待复习)"""
    data = await get_dashboard(db, family.id, child_id)
    return SuccessResponse(data=data)


@router.get("/analytics/heatmap")
async def heatmap_endpoint(
    child_id: uuid.UUID = Query(...),
    days: int = Query(30, ge=7, le=90, description="回溯天数"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """错题热力图 (近 N 天每天每学科)"""
    data = await get_heatmap(db, family.id, child_id, days=days)
    return SuccessResponse(data=data)


@router.get("/analytics/weekly-report", response_model=SuccessResponse[WeeklyReportResponse])
async def weekly_report_endpoint(
    child_id: Optional[uuid.UUID] = Query(None, description="孩子 ID, 不传 = 全部孩子"),
    week_start: Optional[datetime] = Query(None, description="周开始 (周一), 不传 = 上周"),
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """周报 (上周/指定周)"""
    report = await get_weekly_report(
        db,
        family.id,
        child_id=child_id,
        week_start=week_start,
    )
    return SuccessResponse(data=report)


__all__ = ["router"]
