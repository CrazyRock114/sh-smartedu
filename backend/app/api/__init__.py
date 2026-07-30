"""API 路由汇总"""
from fastapi import APIRouter

from app.api import auth, child, error, knowledge, curriculum, push

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(child.router)
api_router.include_router(error.router)
api_router.include_router(knowledge.router)
api_router.include_router(curriculum.router)
api_router.include_router(push.router)
