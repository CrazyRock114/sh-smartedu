"""通用 schemas"""
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseResponse(BaseModel):
    """所有响应的基类"""
    model_config = ConfigDict(from_attributes=True)


class SuccessResponse(BaseResponse, Generic[T]):
    """成功响应 (带 data)"""
    success: bool = True
    message: str = "ok"
    data: Optional[T] = None


class ErrorResponse(BaseResponse):
    """错误响应"""
    success: bool = False
    error: str = Field(description="错误代码, e.g. 'AUTH_FAILED'")
    message: str = Field(description="用户友好的错误信息")
    details: Optional[dict] = Field(default=None, description="详细信息 (开发环境)")


class IdResponse(BaseResponse):
    """ID 响应 (创建/更新后返回)"""
    id: str
    message: str = "ok"


class Pagination(BaseModel):
    """分页参数"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginationResponse(BaseResponse, Generic[T]):
    """分页响应"""
    items: list[T]
    total: int
    page: int = 1
    page_size: int = 20
    has_more: bool = False
