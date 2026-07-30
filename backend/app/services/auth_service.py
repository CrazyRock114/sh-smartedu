"""Auth service - 邮箱+密码 注册/登录/JWT

流程:
1. POST /api/auth/register  → email + password + 昵称 → 建 Family, 签 JWT
2. POST /api/auth/login     → email + password → 校验, 签 JWT
3. GET  /api/auth/me        → Bearer token → 返回当前用户
"""
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.child import Child
from app.models.family import Family
from app.schemas.auth import CurrentUserResponse, TokenResponse

logger = logging.getLogger(__name__)


# Bearer token scheme (auto_error=False 让我们在依赖里手写 401 文案)
bearer_scheme = HTTPBearer(auto_error=False)


# === 注册 ===

# 简单的邀请码白名单 (从 .env 读, 逗号分隔)
def _get_valid_invite_codes() -> set[str]:
    if not settings.INVITE_CODES:
        return set()
    return {c.strip() for c in settings.INVITE_CODES.split(",") if c.strip()}


async def register(
    db: AsyncSession,
    email: str,
    password: str,
    nickname: Optional[str] = None,
    invite_code: Optional[str] = None,
) -> TokenResponse:
    """注册新家庭

    - email 唯一
    - 密码至少 8 位, 内部用 bcrypt 哈希
    - 如果设置了 INVITE_CODES, 必须传有效邀请码
    """
    email_normalized = email.lower().strip()

    # 邀请码校验
    valid_codes = _get_valid_invite_codes()
    if valid_codes:
        if not invite_code or invite_code not in valid_codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "INVALID_INVITE_CODE",
                    "message": "需要有效的邀请码 (请向石头要)",
                },
            )

    # 邮箱已注册?
    stmt = select(Family).where(Family.email == email_normalized)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "EMAIL_TAKEN",
                "message": f"邮箱 {email_normalized} 已被注册, 直接登录即可",
            },
        )

    # 密码强度 (简单校验, 前端也有)
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "PASSWORD_TOO_SHORT", "message": "密码至少 8 位"},
        )
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        # 不强制, 只是个 hint — 暂时不拦
        pass

    family = Family(
        id=uuid.uuid4(),
        email=email_normalized,
        password_hash=get_password_hash(password),
        nickname=nickname or email_normalized.split("@")[0],
        last_active_at=datetime.now(timezone.utc),
        is_active=True,
    )
    db.add(family)
    await db.commit()
    await db.refresh(family)

    # 签 JWT
    expires_seconds = settings.JWT_EXPIRE_DAYS * 86400
    token = create_access_token(
        subject=str(family.id),
        extra_data={"email": family.email},
    )

    logger.info(f"new family registered: {family.id} ({family.email})")
    return TokenResponse(
        access_token=token,
        expires_in=expires_seconds,
        family_id=str(family.id),
        email=family.email,
        nickname=family.nickname,
        avatar_url=family.avatar_url,
        is_new_user=True,
    )


# === 登录 ===

async def login(
    db: AsyncSession,
    email: str,
    password: str,
) -> TokenResponse:
    """邮箱+密码登录"""
    email_normalized = email.lower().strip()

    stmt = select(Family).where(Family.email == email_normalized)
    family = (await db.execute(stmt)).scalar_one_or_none()

    if family is None or not verify_password(password, family.password_hash):
        # 故意不区分"邮箱不存在"和"密码错", 防枚举
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "INVALID_CREDENTIALS",
                "message": "邮箱或密码错误",
            },
        )

    if not family.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "ACCOUNT_DISABLED", "message": "账号已停用, 联系石头"},
        )

    # 更新最后活跃
    family.last_active_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(family)

    expires_seconds = settings.JWT_EXPIRE_DAYS * 86400
    token = create_access_token(
        subject=str(family.id),
        extra_data={"email": family.email},
    )

    return TokenResponse(
        access_token=token,
        expires_in=expires_seconds,
        family_id=str(family.id),
        email=family.email,
        nickname=family.nickname,
        avatar_url=family.avatar_url,
        is_new_user=False,
    )


# === 当前用户 ===

async def get_current_family(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Family:
    """从 Bearer token 拿当前 Family (FastAPI 依赖)"""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "MISSING_TOKEN", "message": "请先登录"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    from app.core.security import decode_access_token

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "INVALID_TOKEN", "message": "Token 无效或已过期"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        family_id = uuid.UUID(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "INVALID_TOKEN", "message": "Token 内容异常"},
        )

    stmt = select(Family).where(Family.id == family_id)
    family = (await db.execute(stmt)).scalar_one_or_none()
    if family is None or not family.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "USER_NOT_FOUND", "message": "账号不存在或已停用"},
        )

    return family


async def get_current_user_response(
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
) -> CurrentUserResponse:
    """当前用户 + 孩子数"""
    child_count_stmt = select(Child).where(
        Child.family_id == family.id, Child.archived == False  # noqa: E712
    )
    children = (await db.execute(child_count_stmt)).scalars().all()
    return CurrentUserResponse(
        id=str(family.id),
        email=family.email,
        nickname=family.nickname,
        avatar_url=family.avatar_url,
        push_enabled=family.push_enabled,
        push_time=family.push_time,
        daily_limit_minutes=family.daily_limit_minutes,
        lock_at_night=family.lock_at_night,
        lock_time=family.lock_time,
        child_count=len(children),
    )


__all__ = [
    "register",
    "login",
    "get_current_family",
    "get_current_user_response",
    "bearer_scheme",
]
