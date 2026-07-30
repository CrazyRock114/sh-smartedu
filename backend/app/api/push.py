"""推送 API (阶段 6 实现完整版)"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/subscribe")
async def subscribe_push():
    """订阅推送"""
    return {"message": "TODO: 阶段 6 实现"}


@router.post("/unsubscribe")
async def unsubscribe_push():
    """取消订阅"""
    return {"message": "TODO: 阶段 6 实现"}


@router.get("/weekly-report")
async def get_weekly_report():
    """获取周报内容"""
    return {"message": "TODO: 阶段 6 实现"}
