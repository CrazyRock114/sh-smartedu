"""Curriculum schemas - 教材改版 / 章节"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import BaseResponse


class CurriculumChangeItem(BaseModel):
    """单个改版项 (存为 JSON 数组里的元素)"""
    chapter: str
    type: str = Field(description="new / adjusted / removed / renamed")
    summary: str
    key_points: list[str] = Field(default_factory=list)


class CurriculumChangeResponse(BaseResponse):
    """教材改版详情"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    grade: int
    subject: str
    version: str
    semester: str  # e.g. "2024-fall"

    changes: list[CurriculumChangeItem]

    source: str
    source_url: Optional[str] = None
    verified: bool

    created_at: datetime
    updated_at: datetime


class CurriculumChangeListItem(BaseModel):
    """教材改版列表项"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    grade: int
    subject: str
    version: str
    semester: str
    change_count: int = 0
    verified: bool


class ChapterWeekly(BaseModel):
    """本周要学的章节"""
    chapter: str
    name: str
    week_index: int = Field(description="第几周 (1-based)")
    knowledge_point_count: int = 0
    knowledge_point_codes: list[str] = Field(default_factory=list)
    video_url: Optional[str] = None
    note: Optional[str] = None


class WeeklyChaptersResponse(BaseModel):
    """本周章节响应"""
    grade: int
    subject: str
    version: str
    semester: str
    week_index: int
    chapters: list[ChapterWeekly]
    is_new_textbook: bool = Field(default=False, description="是否使用新教材")
    change_notice: Optional[str] = None


class ChapterListResponse(BaseModel):
    """某学期全部章节"""
    grade: int
    subject: str
    version: str
    semester: str
    chapters: list[str]
    new_textbook_chapters: list[str] = Field(default_factory=list, description="本学期新教材改动的章节")


__all__ = [
    "CurriculumChangeItem",
    "CurriculumChangeResponse",
    "CurriculumChangeListItem",
    "ChapterWeekly",
    "WeeklyChaptersResponse",
    "ChapterListResponse",
]
