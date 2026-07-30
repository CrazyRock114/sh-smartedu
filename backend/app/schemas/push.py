"""Push schemas - 推送 / 订阅 / 周报"""
import uuid
import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import BaseResponse


# 推送类型枚举
PUSH_TYPES = ["daily", "weekly", "alert", "monthly"]
PUSH_CHANNELS = ["wechat_sub", "wechat_mp", "in_app"]


class SubscribeRequest(BaseModel):
    """订阅推送"""
    push_type: str = Field(default="weekly", description="daily / weekly / alert / monthly")
    push_time: str = Field(default="19:00", description="HH:MM, 默认晚 7 点")
    enabled: bool = True

    @field_validator("push_type")
    @classmethod
    def validate_push_type(cls, v: str) -> str:
        if v not in PUSH_TYPES:
            raise ValueError(f"push_type 必须是 {PUSH_TYPES} 之一")
        return v

    @field_validator("push_time")
    @classmethod
    def validate_push_time(cls, v: str) -> str:
        if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", v):
            raise ValueError("push_time 必须是 HH:MM 格式 (24h)")
        return v


class SubscribeResponse(BaseResponse):
    """订阅结果"""
    push_type: str
    push_time: str
    enabled: bool
    message: str = "ok"


class PushPreferenceUpdate(BaseModel):
    """更新推送偏好"""
    push_enabled: Optional[bool] = None
    push_time: Optional[str] = None
    daily_limit_minutes: Optional[int] = Field(default=None, ge=5, le=180)
    lock_at_night: Optional[bool] = None
    lock_time: Optional[str] = None

    @field_validator("push_time", "lock_time")
    @classmethod
    def validate_time_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", v):
            raise ValueError("时间必须是 HH:MM 格式 (24h)")
        return v


class PushPreferenceResponse(BaseResponse):
    """推送偏好"""
    push_enabled: bool
    push_time: str
    daily_limit_minutes: int
    lock_at_night: bool
    lock_time: str


class PushRecordItem(BaseModel):
    """推送记录项"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    family_id: uuid.UUID
    child_id: Optional[uuid.UUID] = None
    push_type: str
    content_summary: str
    sent_at: datetime
    opened_at: Optional[datetime] = None
    push_channel: str


class WeeklyReportRequest(BaseModel):
    """周报请求"""
    child_id: Optional[uuid.UUID] = Field(default=None, description="指定孩子, 默认全部")
    week_start: Optional[datetime] = Field(default=None, description="周开始日期, 默认上周一")


class SubjectSummary(BaseModel):
    """单学科周报汇总"""
    subject: str
    new_errors: int = 0
    mastered: int = 0
    reviewing: int = 0
    weak_points: list[str] = Field(default_factory=list, description="薄弱知识点 code 列表")
    suggestion: Optional[str] = None


class WeeklyReportResponse(BaseResponse):
    """周报"""
    family_id: uuid.UUID
    child_id: Optional[uuid.UUID] = None
    week_start: datetime
    week_end: datetime

    total_study_minutes: int = 0
    total_new_errors: int = 0
    total_reviewed: int = 0
    total_mastered: int = 0

    subjects: list[SubjectSummary] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list, description="本周亮点")
    next_week_focus: list[str] = Field(default_factory=list, description="下周重点")


__all__ = [
    "PUSH_TYPES",
    "PUSH_CHANNELS",
    "SubscribeRequest",
    "SubscribeResponse",
    "PushPreferenceUpdate",
    "PushPreferenceResponse",
    "PushRecordItem",
    "WeeklyReportRequest",
    "SubjectSummary",
    "WeeklyReportResponse",
]
