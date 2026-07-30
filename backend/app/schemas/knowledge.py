"""Knowledge schemas - 知识点与图谱"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import BaseResponse


class KnowledgePointBase(BaseModel):
    """知识点基础信息 (教研数据, 只读)"""
    code: str = Field(description="唯一 code, e.g. MATH-G3-CH1-K001")
    subject: str
    grade: int = Field(ge=1, le=6)
    chapter: str
    name: str
    description: Optional[str] = None

    prerequisites: list[str] = Field(default_factory=list, description="前置知识点 code")
    successors: list[str] = Field(default_factory=list, description="后续知识点 code")
    related: list[str] = Field(default_factory=list, description="相关知识点 code")

    importance: int = Field(default=3, ge=1, le=5)
    difficulty: int = Field(default=3, ge=1, le=5)

    video_urls: list[str] = Field(default_factory=list, description="关联微课 URL (basic.sh.smartedu.cn)")
    common_errors: list[str] = Field(default_factory=list, description="常见错误模式")


class KnowledgePointResponse(KnowledgePointBase, BaseResponse):
    """知识点详情"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str  # draft / published / deprecated
    created_at: datetime
    updated_at: datetime


class KnowledgePointListItem(BaseModel):
    """知识点列表项"""
    model_config = ConfigDict(from_attributes=True)

    code: str
    subject: str
    grade: int
    chapter: str
    name: str
    importance: int
    difficulty: int


class GraphNode(BaseModel):
    """图谱节点 (含孩子掌握度)"""
    code: str
    name: str
    chapter: str
    importance: int
    difficulty: int
    # 孩子当前状态
    mastery: float = Field(default=0.0, ge=0.0, le=1.0, description="0-1, 0=未学, 1=完全掌握")
    error_count: int = Field(default=0, description="累计错题数")
    has_video: bool = False


class GraphEdge(BaseModel):
    """图谱边"""
    source: str = Field(description="源节点 code")
    target: str = Field(description="目标节点 code")
    relation: str = Field(description="prerequisite / successor / related")


class KnowledgeGraphResponse(BaseModel):
    """知识图谱响应 (用于力导向/树状可视化)"""
    subject: str
    grade: int
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    summary: dict = Field(
        default_factory=dict,
        description="汇总: total/mastered/in_progress/unstudied 节点数",
    )


class ChapterInfo(BaseModel):
    """章节信息"""
    chapter: str
    knowledge_points: list[KnowledgePointListItem]
    total_points: int


__all__ = [
    "KnowledgePointBase",
    "KnowledgePointResponse",
    "KnowledgePointListItem",
    "GraphNode",
    "GraphEdge",
    "KnowledgeGraphResponse",
    "ChapterInfo",
]
