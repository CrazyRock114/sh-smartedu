"""Pydantic schemas - API 请求/响应数据类

按业务域拆分:
- common: 通用 (错误响应、分页、ID 等)
- auth: 注册/登录/token
- child: 孩子档案
- error: 错题
- knowledge: 知识点
- curriculum: 教材
- push: 推送
"""
from app.schemas.common import (
    BaseResponse,
    ErrorResponse,
    IdResponse,
    Pagination,
    PaginationResponse,
    SuccessResponse,
)
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.child import (
    SUBJECTS,
    TEXTBOOK_VERSIONS,
    ChildCreate,
    ChildListItem,
    ChildResponse,
    ChildUpdate,
    SubjectTextbookVersion,
)
from app.schemas.error import (
    ERROR_TYPES,
    ErrorItemCreate,
    ErrorItemFromOcr,
    ErrorItemListItem,
    ErrorItemResponse,
    ErrorItemUpdate,
    ErrorStats,
    ReviewQueueItem,
    ReviewSubmitRequest,
)
from app.schemas.knowledge import (
    ChapterInfo,
    GraphEdge,
    GraphNode,
    KnowledgeGraphResponse,
    KnowledgePointBase,
    KnowledgePointListItem,
    KnowledgePointResponse,
)
from app.schemas.curriculum import (
    ChapterListResponse,
    ChapterWeekly,
    CurriculumChangeItem,
    CurriculumChangeListItem,
    CurriculumChangeResponse,
    WeeklyChaptersResponse,
)
from app.schemas.push import (
    PUSH_CHANNELS,
    PUSH_TYPES,
    PushPreferenceResponse,
    PushPreferenceUpdate,
    PushRecordItem,
    SubjectSummary,
    SubscribeRequest,
    SubscribeResponse,
    WeeklyReportRequest,
    WeeklyReportResponse,
)

__all__ = [
    # common
    "BaseResponse",
    "ErrorResponse",
    "IdResponse",
    "Pagination",
    "PaginationResponse",
    "SuccessResponse",
    # auth
    "CurrentUserResponse",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    # child
    "ChildCreate",
    "ChildListItem",
    "ChildResponse",
    "ChildUpdate",
    "SubjectTextbookVersion",
    "SUBJECTS",
    "TEXTBOOK_VERSIONS",
    # error
    "ERROR_TYPES",
    "ErrorItemCreate",
    "ErrorItemFromOcr",
    "ErrorItemListItem",
    "ErrorItemResponse",
    "ErrorItemUpdate",
    "ErrorStats",
    "ReviewQueueItem",
    "ReviewSubmitRequest",
    # knowledge
    "ChapterInfo",
    "GraphEdge",
    "GraphNode",
    "KnowledgeGraphResponse",
    "KnowledgePointBase",
    "KnowledgePointListItem",
    "KnowledgePointResponse",
    # curriculum
    "ChapterListResponse",
    "ChapterWeekly",
    "CurriculumChangeItem",
    "CurriculumChangeListItem",
    "CurriculumChangeResponse",
    "WeeklyChaptersResponse",
    # push
    "PUSH_CHANNELS",
    "PUSH_TYPES",
    "PushPreferenceResponse",
    "PushPreferenceUpdate",
    "PushRecordItem",
    "SubjectSummary",
    "SubscribeRequest",
    "SubscribeResponse",
    "WeeklyReportRequest",
    "WeeklyReportResponse",
]
