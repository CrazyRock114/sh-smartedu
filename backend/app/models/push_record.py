"""PushRecord 模型 - 推送记录"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class PushRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """推送记录 (用于频率限制 + 审计)"""

    __tablename__ = "push_records"

    family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("families.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    child_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("children.id", ondelete="SET NULL"),
        nullable=True,
    )

    push_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    # daily / weekly / alert / monthly
    content_summary: Mapped[str] = mapped_column(String(512), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    push_channel: Mapped[str] = mapped_column(String(32), default="wechat_sub", nullable=False)
