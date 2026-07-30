"""教材改版 API (阶段 1 即可用, 阶段 2 完善)"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/changes")
async def list_curriculum_changes(grade: int | None = None, subject: str | None = None):
    """列出教材改版信息"""
    return {"message": "TODO: 阶段 2 实现", "items": [], "grade": grade, "subject": subject}


@router.get("/chapters")
async def get_chapters(grade: int, subject: str, version: str, semester: str):
    """获取指定学期章节列表"""
    return {"message": "TODO: 阶段 2 实现"}


@router.get("/weekly")
async def get_weekly_chapter(grade: int, subject: str, version: str):
    """获取本周要学的章节 (推送用)"""
    return {"message": "TODO: 阶段 6 实现"}
