"""Auth schemas - 邮箱+密码 登录/注册"""
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.common import BaseResponse


class RegisterRequest(BaseModel):
    """注册请求"""
    email: EmailStr = Field(description="邮箱, 作为登录账号")
    password: str = Field(min_length=8, max_length=128, description="密码 (至少 8 位)")
    nickname: Optional[str] = Field(default=None, max_length=64, description="家长昵称")
    invite_code: Optional[str] = Field(default=None, max_length=32, description="邀请码 (可选, 内部白名单)")


class LoginRequest(BaseModel):
    """登录请求"""
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseResponse):
    """登录/注册返回"""
    model_config = ConfigDict(from_attributes=True)

    access_token: str
    token_type: str = "Bearer"
    expires_in: int = Field(description="过期秒数")
    family_id: str
    email: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    is_new_user: bool = Field(default=False, description="是否新注册 (注册接口专属)")


class CurrentUserResponse(BaseResponse):
    """当前登录用户信息 (/api/auth/me)"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    push_enabled: bool
    push_time: str
    daily_limit_minutes: int
    lock_at_night: bool
    lock_time: str
    child_count: int = 0


__all__ = [
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
    "CurrentUserResponse",
]
