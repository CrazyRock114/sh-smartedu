"""StudyRecord 模型 - 学习记录"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class StudyRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """学习活动记录 (用于时长统计、报告)"""

    __tablename__ = "study_records"

    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("children.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    activity: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    # review / preview / ocr_upload / knowledge_browse / error_submit
    subject: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    knowledge_point_ids: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    error_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("error_items.id", ondelete="SET NULL"),
        nullable=True,
    )

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    device: Mapped[str] = mapped_column(String(32), default="web", nullable=False)
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # 关联
    child = relationship("Child", back_populates="study_records")
