"""Child 模型 - 孩子档案"""
import uuid
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Child(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """孩子档案"""

    __tablename__ = "children"

    family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("families.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # 基本信息
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    grade: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-6
    class_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    school_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # 教材版本: { 'math': '沪教版', 'chinese': '统编版', 'english': '人教PEP版', ... }
    textbook_versions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # 头像
    avatar: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # 状态
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # 关联
    family = relationship("Family", back_populates="children")
    error_items = relationship("ErrorItem", back_populates="child", cascade="all, delete-orphan")
    mastery_states = relationship("MasteryState", back_populates="child", cascade="all, delete-orphan")
    study_records = relationship("StudyRecord", back_populates="child", cascade="all, delete-orphan")
