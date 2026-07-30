"""Child schemas - 孩子档案"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import BaseResponse


# 学科可选值
SUBJECTS = ["math", "chinese", "english", "science", "moral", "pe", "art"]

# 教材版本 (可扩展)
TEXTBOOK_VERSIONS = {
    "math": ["沪教版", "人教版", "北师大版", "苏教版"],
    "chinese": ["统编版"],
    "english": ["人教PEP版", "沪教版", "牛津上海版", "译林版"],
    "science": [],
    "moral": ["统编版"],
    "pe": [],
    "art": [],
}


class SubjectTextbookVersion(BaseModel):
    """单学科的教材版本"""
    subject: str = Field(description="学科代码")
    version: str = Field(description="教材版本")


class ChildBase(BaseModel):
    """孩子基础信息"""
    name: str = Field(min_length=1, max_length=64, description="孩子姓名或昵称")
    grade: int = Field(ge=1, le=6, description="年级 (1-6)")
    class_name: Optional[str] = Field(default=None, max_length=64)
    school_name: Optional[str] = Field(default=None, max_length=128)

    textbook_versions: list[SubjectTextbookVersion] = Field(
        default_factory=list,
        description="各学科教材版本 (数学必填)",
    )

    avatar: Optional[str] = Field(default=None, max_length=512)

    @field_validator("textbook_versions")
    @classmethod
    def validate_textbook(cls, v: list[SubjectTextbookVersion]) -> list[SubjectTextbookVersion]:
        """校验教材版本"""
        for item in v:
            if item.subject not in SUBJECTS:
                raise ValueError(f"不支持的学科: {item.subject}")
            allowed = TEXTBOOK_VERSIONS.get(item.subject, [])
            if allowed and item.version not in allowed:
                raise ValueError(f"{item.subject} 不支持的教材版本: {item.version}, 允许: {allowed}")
        return v


class ChildCreate(ChildBase):
    """创建孩子"""
    pass


class ChildUpdate(BaseModel):
    """更新孩子 (字段可选)"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=64)
    grade: Optional[int] = Field(default=None, ge=1, le=6)
    class_name: Optional[str] = None
    school_name: Optional[str] = None
    textbook_versions: Optional[list[SubjectTextbookVersion]] = None
    avatar: Optional[str] = None


class ChildResponse(ChildBase, BaseResponse):
    """孩子详情"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    family_id: uuid.UUID
    archived: bool
    created_at: datetime
    updated_at: datetime


class ChildListItem(BaseModel):
    """孩子列表项 (轻量)"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    grade: int
    avatar: Optional[str] = None
    textbook_versions: list[SubjectTextbookVersion] = []
