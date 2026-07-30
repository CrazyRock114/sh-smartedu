"""KnowledgePoint 模型 - 知识点"""
from typing import Optional

from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class KnowledgePoint(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """知识点 (教研数据, 只读)"""

    __tablename__ = "knowledge_points"

    # 标识
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    # 例如: "MATH-G3-CH1-K001" (学科-年级-章节-序号)

    # 层级
    subject: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    # math / chinese / english / science / moral
    grade: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    chapter: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    # 关联 (存 ID 数组, 不做外键以便灵活管理)
    prerequisites: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    successors: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    related: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)

    # 元数据
    importance: Mapped[int] = mapped_column(Integer, default=3, nullable=False)  # 1-5
    difficulty: Mapped[int] = mapped_column(Integer, default=3, nullable=False)  # 1-5

    # 教学数据 (JSON 数组)
    video_urls: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    common_errors: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)

    # 状态
    status: Mapped[str] = mapped_column(String(16), default="published", nullable=False)
    # draft / published / deprecated
