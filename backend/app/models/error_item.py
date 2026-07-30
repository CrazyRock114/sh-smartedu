"""ErrorItem 模型 - 错题"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin, utc_now


# 7 类错因枚举
ERROR_TYPES = [
    "CARELESS",          # 粗心/计算错
    "READING_WRONG",     # 审题错
    "METHOD_WRONG",      # 方法错
    "CONCEPT_CONFUSE",   # 概念混
    "KNOWLEDGE_GAP",     # 知识缺失
    "TIME_PRESSURE",     # 速度慢
    "OTHER",             # 其他
]


class ErrorItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """错题"""

    __tablename__ = "error_items"

    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("children.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    subject: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    knowledge_point_ids: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)

    # 内容
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    student_answer: Mapped[str] = mapped_column(Text, nullable=False)

    # 错因
    error_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    error_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 来源
    source: Mapped[str] = mapped_column(String(32), default="manual", nullable=False)
    # ocr / manual / parent_input
    source_note: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    # 复习状态
    status: Mapped[str] = mapped_column(String(16), default="new", index=True, nullable=False)
    # new / reviewing / mastered / archived
    next_review_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True, nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_review_correct: Mapped[Optional[bool]] = mapped_column(nullable=True)

    # 关联
    child = relationship("Child", back_populates="error_items")
    review_items = relationship("ReviewQueueItem", back_populates="error_item", cascade="all, delete-orphan")
