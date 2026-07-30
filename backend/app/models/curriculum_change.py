"""CurriculumChange 模型 - 教材改版"""
from typing import Optional

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class CurriculumChange(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """教材改版信息 (教研数据, 只读)"""

    __tablename__ = "curriculum_changes"

    grade: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    # 沪教版 / 统编版 / 人教PEP版
    semester: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    # 2024-fall / 2025-spring

    # 改了什么
    changes: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    # 例: [{ chapter, type: 'new'|'adjusted'|'removed', summary, key_points: [...] }]

    # 来源
    source: Mapped[str] = mapped_column(String(64), default="内部整理", nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
