"""Error schemas - 错题相关"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.error_item import ERROR_TYPES
from app.schemas.common import BaseResponse


class ErrorItemBase(BaseModel):
    """错题基础信息"""
    subject: str = Field(description="学科")
    knowledge_point_ids: list[str] = Field(
        default_factory=list,
        description="关联知识点 code 列表, e.g. ['MATH-G3-CH1-K001']",
    )

    question_text: str = Field(min_length=1, max_length=4096, description="题目原文")
    question_image_url: Optional[str] = Field(default=None, max_length=512, description="题目图片 URL")
    correct_answer: str = Field(min_length=1, max_length=2048)
    student_answer: str = Field(min_length=1, max_length=2048)

    error_type: str = Field(description="错因 (7 类之一)")
    error_note: Optional[str] = Field(default=None, max_length=1024, description="家长补充说明")

    source: str = Field(default="manual", description="manual / ocr / parent_input")
    source_note: Optional[str] = Field(default=None, max_length=256)

    @field_validator("error_type")
    @classmethod
    def validate_error_type(cls, v: str) -> str:
        if v not in ERROR_TYPES:
            raise ValueError(f"错因必须是 {ERROR_TYPES} 之一, 当前: {v}")
        return v

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        allowed = {"manual", "ocr", "parent_input"}
        if v not in allowed:
            raise ValueError(f"source 必须是 {allowed} 之一, 当前: {v}")
        return v


class ErrorItemCreate(ErrorItemBase):
    """创建错题 (手动录入)"""
    pass


class ErrorItemFromOcr(BaseModel):
    """OCR 录入: 前端先 OCR 得到文字, 再走正常 create 流程"""
    question_text: str
    question_image_url: str
    suggested_error_type: Optional[str] = None  # GLM 辅助建议
    subject: str


class ErrorItemUpdate(BaseModel):
    """更新错题 (字段可选)"""
    knowledge_point_ids: Optional[list[str]] = None
    error_type: Optional[str] = None
    error_note: Optional[str] = None
    correct_answer: Optional[str] = None
    student_answer: Optional[str] = None

    @field_validator("error_type")
    @classmethod
    def validate_error_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ERROR_TYPES:
            raise ValueError(f"错因必须是 {ERROR_TYPES} 之一, 当前: {v}")
        return v


class ReviewSubmitRequest(BaseModel):
    """提交复习结果"""
    result: str = Field(description="correct / wrong / skip")
    time_spent_seconds: Optional[int] = Field(default=None, ge=0)

    @field_validator("result")
    @classmethod
    def validate_result(cls, v: str) -> str:
        if v not in {"correct", "wrong", "skip"}:
            raise ValueError("result 必须是 correct / wrong / skip")
        return v


class ErrorItemResponse(ErrorItemBase, BaseResponse):
    """错题详情"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    child_id: uuid.UUID

    status: str  # new / reviewing / mastered / archived
    next_review_at: Optional[datetime] = None
    review_count: int = 0
    last_reviewed_at: Optional[datetime] = None
    last_review_correct: Optional[bool] = None

    created_at: datetime
    updated_at: datetime


class ErrorItemListItem(BaseModel):
    """错题列表项 (轻量, 不含长文本)"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    child_id: uuid.UUID
    subject: str
    error_type: str
    status: str
    next_review_at: Optional[datetime] = None
    review_count: int = 0
    # 列表展示时截断的题目
    question_preview: str = Field(default="", description="截断到 50 字符")
    created_at: datetime


class ReviewQueueItem(BaseModel):
    """复习队列项"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID  # ErrorItem.id
    child_id: uuid.UUID
    subject: str
    question_text: str
    question_image_url: Optional[str] = None
    correct_answer: str
    student_answer: str
    error_type: str
    next_review_at: Optional[datetime] = None
    review_count: int = 0
    is_overdue: bool = Field(default=False, description="是否已过期该复习")


class ErrorStats(BaseModel):
    """错题统计"""
    total: int = 0
    by_subject: dict[str, int] = Field(default_factory=dict)
    by_error_type: dict[str, int] = Field(default_factory=dict)
    by_status: dict[str, int] = Field(default_factory=dict)
    due_today: int = 0
    mastered_this_week: int = 0


__all__ = [
    "ERROR_TYPES",
    "ErrorItemBase",
    "ErrorItemCreate",
    "ErrorItemFromOcr",
    "ErrorItemUpdate",
    "ErrorItemResponse",
    "ErrorItemListItem",
    "ReviewSubmitRequest",
    "ReviewQueueItem",
    "ErrorStats",
]
