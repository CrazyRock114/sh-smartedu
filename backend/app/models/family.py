"""Family 模型 - 家庭 (一个家长账号 = 一个 Family)"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin, utc_now


class Family(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """家庭 (一个微信账号对应一个 Family, 可加多个孩子)"""

    __tablename__ = "families"

    # 微信信息
    wx_openid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    wx_unionid: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    nickname: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # 家长信息 (可选)
    parent_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # 加密

    # 偏好设置
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    push_time: Mapped[str] = mapped_column(String(5), default="19:00", nullable=False)  # HH:MM
    daily_limit_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    lock_at_night: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    lock_time: Mapped[str] = mapped_column(String(5), default="21:00", nullable=False)

    # 系统
    last_active_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # 关联
    children = relationship("Child", back_populates="family", cascade="all, delete-orphan")
