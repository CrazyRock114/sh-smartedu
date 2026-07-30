"""孩子档案 API (阶段 2 实现完整版)"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_children():
    """列出当前家庭的所有孩子"""
    return {"message": "TODO: 阶段 2 实现", "items": []}


@router.post("/")
async def create_child():
    """添加孩子"""
    return {"message": "TODO: 阶段 2 实现"}


@router.get("/{child_id}")
async def get_child(child_id: str):
    """获取单个孩子详情"""
    return {"message": "TODO: 阶段 2 实现", "child_id": child_id}


@router.patch("/{child_id}")
async def update_child(child_id: str):
    """更新孩子信息 (年级、教材版本等)"""
    return {"message": "TODO: 阶段 2 实现", "child_id": child_id}


@router.delete("/{child_id}")
async def delete_child(child_id: str):
    """删除/归档孩子"""
    return {"message": "TODO: 阶段 2 实现", "child_id": child_id}
