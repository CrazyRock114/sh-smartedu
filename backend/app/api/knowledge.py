"""知识图谱 API (阶段 5 实现完整版)"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_knowledge_points():
    """列出知识点 (按学科/年级筛选)"""
    return {"message": "TODO: 阶段 5 实现", "items": []}


@router.get("/{code}")
async def get_knowledge_point(code: str):
    """获取知识点详情 + 关联错题 + 视频"""
    return {"message": "TODO: 阶段 5 实现", "code": code}


@router.get("/{code}/graph")
async def get_knowledge_graph(code: str, depth: int = 2):
    """获取知识点关联图 (用于可视化)"""
    return {"message": "TODO: 阶段 5 实现", "code": code, "depth": depth}
