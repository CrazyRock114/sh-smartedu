"""FastAPI 主入口"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.db import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    # 启动
    print(f"🚀 {settings.APP_NAME} 启动中...")
    print(f"   环境: {settings.APP_ENV}")
    print(f"   端口: {settings.PORT}")
    yield
    # 关闭
    await engine.dispose()
    print(f"👋 {settings.APP_NAME} 关闭")


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="学迹 (Xueji) · 上海小学生学习辅助平台",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """根路径: 健康检查 + 基本信息"""
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "env": settings.APP_ENV,
        "status": "ok",
        "docs": "/docs" if settings.DEBUG else None,
    }


@app.get("/health")
async def health():
    """健康检查 (部署用)"""
    return {"status": "ok"}


# 注册 API 路由
app.include_router(api_router, prefix=settings.API_PREFIX)
