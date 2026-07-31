"""SmartEduVideo 模型 - 真实从 basic.sh.smartedu.cn 抓取的微课

跟 WeeklyVideo 区别:
- WeeklyVideo: 人工/脚本生成的 episode 索引 (含 chapter, episode, searchPage URL)
- SmartEduVideo: 真实抓取的微课 (含 resource_id, courseId, mp4 URL, 真实标题/学校/老师)

两份数据并存:
- WeeklyVideo 用于章节列表 + searchPage 跳转 (兜底)
- SmartEduVideo 用于 hero "本周推荐" (真播放器直达)
"""
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class SmartEduVideo(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """从 smartedu 真实抓取的微课 (resource_id + courseId + mp4 URL)"""

    __tablename__ = "smartedu_videos"

    # 定位
    grade: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # math/chinese/english/science
    subject_label: Mapped[str] = mapped_column(String(32), nullable=False)  # 数学/语文/...
    version: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # 沪教版/人教版/...
    version_label: Mapped[str] = mapped_column(String(64), nullable=False)  # 沪教育/...
    semester: Mapped[str] = mapped_column(String(16), index=True, nullable=False)  # 2025-fall / 2025-spring
    term_label: Mapped[str] = mapped_column(String(32), nullable=False)  # 第一学期 / 第二学期

    # smartedu ID
    resource_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False, unique=True)
    subject_id: Mapped[str] = mapped_column(String(64), nullable=False)  # courseId

    # 内容
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    school: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    teacher: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    upload_file_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    release_time: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # 视频 URL
    video_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    # direct URL (smartedu 详情页: airClassroomTaskDetail?resource=...&courseId=...)
    direct_url: Mapped[str] = mapped_column(String(512), nullable=False)

    # 排序
    importance: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    # 0 = 来自 API 默认排序; >=4 = 重要微课 (期末/单元复习)

    # 元
    source: Mapped[str] = mapped_column(String(64), default="basic.sh.smartedu.cn", nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # smartedu 抓的 URL 默认是真实可用的

    def __repr__(self) -> str:
        return f"<SmartEduVideo g{self.grade} {self.subject} {self.semester}: {self.title}>"
