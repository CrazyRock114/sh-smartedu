"""认证 API: 邮箱+密码 注册/登录/当前用户"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.auth_service import (
    get_current_user_response,
    login,
    register,
)

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_endpoint(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """注册新账号

    - email 唯一
    - 密码至少 8 位
    - 如果设置了 INVITE_CODES 环境变量, 必须传 invite_code
    """
    return await register(
        db,
        email=payload.email,
        password=payload.password,
        nickname=payload.nickname,
        invite_code=payload.invite_code,
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login_endpoint(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """登录, 返回 JWT"""
    return await login(db, email=payload.email, password=payload.password)


@router.get("/auth/me", response_model=CurrentUserResponse)
async def me_endpoint(
    current_user: CurrentUserResponse = Depends(get_current_user_response),
):
    """当前登录用户信息"""
    return current_user
