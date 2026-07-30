"""API 路由汇总"""
from fastapi import APIRouter

from app.api import auth, child, error, knowledge, curriculum, push

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(child.router, prefix="/children", tags=["children"])
api_router.include_router(error.router, prefix="/errors", tags=["errors"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
api_router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
api_router.include_router(push.router, prefix="/push", tags=["push"])
