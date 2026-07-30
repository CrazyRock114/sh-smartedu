"""ReviewQueue 模型 - 复习队列"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class ReviewQueueItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """错题的复习计划项

    一道错题入库时, 创建 6 条记录, 对应 6 个阶段 (4h, 1d, 3d, 7d, 14d, 30d)。
    孩子每复习一次, 标记一条完成; 答对进入下一阶段, 答错重置。
    """

    __tablename__ = "review_queue"

    error_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("error_items.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("children.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    result: Mapped[Optional[str]] = mapped_column(nullable=True)  # correct / wrong

    stage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # 0 = 4小时, 1 = 1天, 2 = 3天, 3 = 7天, 4 = 14天, 5 = 30天
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # 关联
    error_item = relationship("ErrorItem", back_populates="review_items")
