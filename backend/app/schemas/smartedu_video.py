"""SmartEduVideo schemas"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SmartEduVideoItem(BaseModel):
    id: str  # UUID, 验证时从 UUID 转 str
    grade: int
    subject: str
    subject_label: str
    version: str
    version_label: str
    semester: str
    term_label: str
    resource_id: str
    subject_id: str
    title: str
    school: Optional[str] = None
    teacher: Optional[str] = None
    upload_file_name: Optional[str] = None
    release_time: Optional[datetime] = None
    video_url: Optional[str] = None
    direct_url: str
    importance: int = 3
    verified: bool = True

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v):
        return str(v) if isinstance(v, UUID) else v


class SmartEduVideoListResponse(BaseModel):
    grade: int
    subject: str
    version: str
    semester: str
    week_index: Optional[int] = None
    total: int = 0
    items: list[SmartEduVideoItem] = Field(default_factory=list)
