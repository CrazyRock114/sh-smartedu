"""MasteryState 模型 - 知识点掌握度"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class MasteryState(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """孩子对某知识点的掌握度"""

    __tablename__ = "mastery_states"

    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("children.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    knowledge_point_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    # 核心
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mastery: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # [0, 1]

    # 错题统计
    error_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recent_errors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 近 30 天

    # 时间
    last_practice_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    first_practice_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # 关联
    child = relationship("Child", back_populates="mastery_states")
