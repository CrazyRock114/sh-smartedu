"""孩子档案 API"""
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.family import Family
from app.schemas.child import (
    ChildCreate,
    ChildListItem,
    ChildResponse,
    ChildUpdate,
)
from app.schemas.common import IdResponse, SuccessResponse
from app.services.auth_service import get_current_family
from app.services.child_service import (
    archive_child,
    create_child,
    get_child_response,
    list_children,
    update_child,
)

router = APIRouter()


@router.get("/children", response_model=SuccessResponse[list[ChildListItem]])
async def list_children_endpoint(
    include_archived: bool = False,
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """列出当前家庭的所有孩子"""
    items = await list_children(db, family.id, include_archived=include_archived)
    return SuccessResponse(data=items)


@router.post(
    "/children",
    response_model=SuccessResponse[ChildResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_child_endpoint(
    payload: ChildCreate,
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """添加孩子"""
    child = await create_child(db, family.id, payload)
    return SuccessResponse(data=child, message="添加成功")


@router.get("/children/{child_id}", response_model=SuccessResponse[ChildResponse])
async def get_child_endpoint(
    child_id: uuid.UUID,
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """获取孩子详情"""
    child = await get_child_response(db, family.id, child_id)
    return SuccessResponse(data=child)


@router.patch("/children/{child_id}", response_model=SuccessResponse[ChildResponse])
async def update_child_endpoint(
    child_id: uuid.UUID,
    payload: ChildUpdate,
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """更新孩子"""
    child = await update_child(db, family.id, child_id, payload)
    return SuccessResponse(data=child, message="更新成功")


@router.delete("/children/{child_id}", response_model=IdResponse)
async def archive_child_endpoint(
    child_id: uuid.UUID,
    family: Family = Depends(get_current_family),
    db: AsyncSession = Depends(get_db),
):
    """归档孩子 (软删除)"""
    await archive_child(db, family.id, child_id)
    return IdResponse(id=str(child_id), message="已归档")
