"""错题 API (阶段 3 实现完整版)"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_errors():
    """列出孩子的错题"""
    return {"message": "TODO: 阶段 3 实现", "items": []}


@router.post("/")
async def create_error():
    """录入错题 (手动 / OCR)"""
    return {"message": "TODO: 阶段 3 实现"}


@router.post("/ocr")
async def ocr_error():
    """OCR 识别错题图片 → 返回文字 + 建议错因"""
    return {"message": "TODO: 阶段 3 实现"}


@router.post("/{error_id}/review")
async def submit_review(error_id: str, result: str = "correct"):
    """提交一次复习结果"""
    return {"message": "TODO: 阶段 3 实现", "error_id": error_id}


@router.get("/review-queue")
async def get_review_queue():
    """获取待复习的错题队列"""
    return {"message": "TODO: 阶段 3 实现", "items": []}
