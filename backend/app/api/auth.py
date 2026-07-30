"""认证 API: 微信扫码登录 (v0.1 占位, 阶段 2 实现)"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/wx-config")
async def get_wx_config():
    """获取微信扫码登录配置 (前端用)"""
    from app.core.config import settings

    return {
        "app_id": settings.WECHAT_APP_ID,
        "redirect_uri": settings.WECHAT_REDIRECT_URI,
        "scope": "snsapi_login",
    }


@router.post("/wx-callback")
async def wx_callback(code: str, state: str = ""):
    """微信回调 (阶段 2 实现)

    1. 用 code 调微信接口换 access_token + openid
    2. 创建/获取 Family
    3. 生成 JWT
    4. 返回
    """
    # TODO: 阶段 2 实现
    return {"message": "TODO: 阶段 2 实现", "code": code}
