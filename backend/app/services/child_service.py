"""Child service - 孩子档案 CRUD"""
import logging
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.child import Child
from app.models.family import Family
from app.schemas.child import (
    ChildCreate,
    ChildListItem,
    ChildResponse,
    ChildUpdate,
    SubjectTextbookVersion,
)

logger = logging.getLogger(__name__)


def _to_response(child: Child) -> ChildResponse:
    """ORM → Response (转换 textbook_versions dict → list[SubjectTextbookVersion])"""
    textbook_versions = [
        SubjectTextbookVersion(subject=k, version=v)
        for k, v in (child.textbook_versions or {}).items()
    ]
    return ChildResponse(
        id=child.id,
        family_id=child.family_id,
        name=child.name,
        grade=child.grade,
        class_name=child.class_name,
        school_name=child.school_name,
        textbook_versions=textbook_versions,
        avatar=child.avatar,
        archived=child.archived,
        created_at=child.created_at,
        updated_at=child.updated_at,
    )


def _to_list_item(child: Child) -> ChildListItem:
    """ORM → 列表项 (轻量)"""
    textbook_versions = [
        SubjectTextbookVersion(subject=k, version=v)
        for k, v in (child.textbook_versions or {}).items()
    ]
    return ChildListItem(
        id=child.id,
        name=child.name,
        grade=child.grade,
        avatar=child.avatar,
        textbook_versions=textbook_versions,
    )


async def get_family(db: AsyncSession, family_id: uuid.UUID) -> Family:
    """获取家庭, 不存在抛 404"""
    stmt = select(Family).where(Family.id == family_id)
    result = await db.execute(stmt)
    family = result.scalar_one_or_none()
    if family is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "FAMILY_NOT_FOUND", "message": "家庭不存在"},
        )
    return family


async def list_children(
    db: AsyncSession,
    family_id: uuid.UUID,
    include_archived: bool = False,
) -> list[ChildListItem]:
    """列出某家庭的所有孩子"""
    stmt = select(Child).where(Child.family_id == family_id)
    if not include_archived:
        stmt = stmt.where(Child.archived == False)  # noqa: E712
    stmt = stmt.order_by(Child.created_at.asc())

    result = await db.execute(stmt)
    children = result.scalars().all()
    return [_to_list_item(c) for c in children]


async def get_child(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
) -> Child:
    """获取单个孩子, 校验归属"""
    stmt = select(Child).where(
        and_(Child.id == child_id, Child.family_id == family_id)
    )
    result = await db.execute(stmt)
    child = result.scalar_one_or_none()
    if child is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "CHILD_NOT_FOUND", "message": "孩子不存在或不属于此家庭"},
        )
    return child


async def get_child_response(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
) -> ChildResponse:
    """获取孩子详情 Response"""
    child = await get_child(db, family_id, child_id)
    return _to_response(child)


async def create_child(
    db: AsyncSession,
    family_id: uuid.UUID,
    payload: ChildCreate,
) -> ChildResponse:
    """添加孩子"""
    # 确保家庭存在
    await get_family(db, family_id)

    # 检查重名 (同家庭不允许同名未归档)
    stmt = select(Child).where(
        and_(
            Child.family_id == family_id,
            Child.name == payload.name,
            Child.archived == False,  # noqa: E712
        )
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "DUPLICATE_NAME",
                "message": f"已存在同名孩子: {payload.name}, 可在列表中归档后再添加",
            },
        )

    # 教材版本 dict 化
    textbook_dict = {tv.subject: tv.version for tv in payload.textbook_versions}

    # 数学必填 (MVP 锁定)
    if "math" not in textbook_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "MATH_TEXTBOOK_REQUIRED",
                "message": "MVP 阶段必须为孩子指定数学教材版本",
            },
        )

    child = Child(
        id=uuid.uuid4(),
        family_id=family_id,
        name=payload.name,
        grade=payload.grade,
        class_name=payload.class_name,
        school_name=payload.school_name,
        textbook_versions=textbook_dict,
        avatar=payload.avatar,
    )
    db.add(child)
    await db.flush()
    await db.refresh(child)

    logger.info(f"child created: {child.id} ({child.name}) for family {family_id}")
    return _to_response(child)


async def update_child(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
    payload: ChildUpdate,
) -> ChildResponse:
    """更新孩子"""
    child = await get_child(db, family_id, child_id)

    update_data = payload.model_dump(exclude_unset=True)

    # 教材版本特殊处理 (list → dict)
    if "textbook_versions" in update_data and update_data["textbook_versions"] is not None:
        tv_list = update_data.pop("textbook_versions")
        update_data["textbook_versions"] = {tv["subject"]: tv["version"] for tv in tv_list}
        # 校验数学必填
        if "math" not in update_data["textbook_versions"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "MATH_TEXTBOOK_REQUIRED",
                    "message": "数学教材版本不可移除",
                },
            )

    for field, value in update_data.items():
        setattr(child, field, value)

    await db.flush()
    await db.refresh(child)
    logger.info(f"child updated: {child.id} ({child.name})")
    return _to_response(child)


async def archive_child(
    db: AsyncSession,
    family_id: uuid.UUID,
    child_id: uuid.UUID,
) -> bool:
    """归档孩子 (软删除, 数据保留)"""
    child = await get_child(db, family_id, child_id)
    child.archived = True
    await db.flush()
    logger.info(f"child archived: {child.id} ({child.name})")
    return True


async def count_children(db: AsyncSession, family_id: uuid.UUID) -> int:
    """统计家庭孩子数 (用于家长版"添加孩子"按钮置灰等)"""
    stmt = select(Child).where(
        and_(Child.family_id == family_id, Child.archived == False)  # noqa: E712
    )
    result = await db.execute(stmt)
    return len(result.scalars().all())


__all__ = [
    "list_children",
    "get_child",
    "get_child_response",
    "create_child",
    "update_child",
    "archive_child",
    "count_children",
    "get_family",
]
