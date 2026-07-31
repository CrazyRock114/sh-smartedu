"""WeeklyVideo 模型 - basic.sh.smartedu.cn 空中课堂微课索引 (教研数据)

设计思路:
- 不存视频本体, 只存 "指向" 官方微课的元数据 + 搜索跳转 URL
- 来源: 上海市教委 basic.sh.smartedu.cn 空中课堂 (公开访问)
- 三种 URL 字段, 按可信度从高到低:
  - direct_url: 已知具体微课 URL (人工核对的精确条目)
  - search_url: 通用搜索 URL (按章节 / 知识点关键词搜索)
  - chapter_listing_url: 章节列表 URL (整章所有微课)
"""
from typing import Optional

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class WeeklyVideo(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """微课索引 (指向 basic.sh.smartedu.cn 公开微课)"""

    __tablename__ = "weekly_videos"

    # 定位
    grade: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    semester: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    # 2024-fall / 2025-spring / 2025-fall

    # 内容
    chapter: Mapped[str] = mapped_column(String(128), nullable=False)
    # 知识图谱 chapter 字段: "第一章·时、分、秒"
    episode: Mapped[str] = mapped_column(String(256), nullable=False)
    # 微课的完整标题: "第1课 时分秒①"
    teacher: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    school: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    duration: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)

    # 链接 (按可信度, 至少有一个非空)
    direct_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    # 精确微课 URL (人工核对的, 不依赖搜索)
    search_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    # basic.sh.smartedu.cn 搜索 URL, 关键词=episode
    chapter_listing_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    # 整章所有微课列表 URL

    # 学期进度
    week_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    importance: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    # 关联
    knowledge_point_codes: Mapped[list[str]] = mapped_column(
        ARRAY(String), default=list, nullable=False
    )

    # 描述 (家长看了知道是讲什么的)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 状态
    source: Mapped[str] = mapped_column(String(64), default="basic.sh.smartedu.cn", nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # true = 人工核对过 direct_url; false = 仅 search_url 占位

