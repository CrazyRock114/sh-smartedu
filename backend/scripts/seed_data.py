"""教研数据导入脚本

读取 data/knowledge/*.yaml 和 data/curriculum/*.yaml, 导入到 PostgreSQL。

使用方式:
    cd backend
    python scripts/seed_data.py
"""
import asyncio
import sys
from pathlib import Path

import yaml
from sqlalchemy import select

# 把项目根目录加入 path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.db import AsyncSessionLocal  # noqa: E402
from app.models.curriculum_change import CurriculumChange  # noqa: E402
from app.models.knowledge_point import KnowledgePoint  # noqa: E402

DATA_DIR = ROOT / "data"


async def import_knowledge_points() -> int:
    """导入知识图谱数据"""
    count = 0
    kp_dir = DATA_DIR / "knowledge"

    async with AsyncSessionLocal() as session:
        for yaml_file in kp_dir.glob("*.yaml"):
            print(f"  📚 导入 {yaml_file.name} ...")
            with open(yaml_file, "r", encoding="utf-8") as f:
                items = yaml.safe_load(f) or []

            for item in items:
                # 检查是否已存在
                stmt = select(KnowledgePoint).where(KnowledgePoint.code == item["code"])
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    # 更新
                    for key, value in item.items():
                        setattr(existing, key, value)
                else:
                    # 新建
                    kp = KnowledgePoint(**item)
                    session.add(kp)
                count += 1

        await session.commit()

    return count


async def import_curriculum_changes() -> int:
    """导入教材改版数据"""
    count = 0
    cc_dir = DATA_DIR / "curriculum"

    async with AsyncSessionLocal() as session:
        for yaml_file in cc_dir.glob("*.yaml"):
            print(f"  📖 导入 {yaml_file.name} ...")
            with open(yaml_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or []

            # 支持两种格式: 顶层是 list, 或顶层是 {changes: [...], general: {...}}
            if isinstance(data, dict) and "changes" in data:
                items = data["changes"]
            else:
                items = data

            for item in items:
                stmt = select(CurriculumChange).where(
                    CurriculumChange.grade == item["grade"],
                    CurriculumChange.subject == item["subject"],
                    CurriculumChange.version == item["version"],
                    CurriculumChange.semester == item["semester"],
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    for key, value in item.items():
                        setattr(existing, key, value)
                else:
                    cc = CurriculumChange(**item)
                    session.add(cc)
                count += 1

        await session.commit()

    return count


async def main():
    """主函数"""
    print("=" * 60)
    print("  学迹 · 教研数据导入")
    print("=" * 60)

    print("\n[1/2] 导入知识图谱...")
    kp_count = await import_knowledge_points()
    print(f"  ✅ 导入知识点 {kp_count} 个")

    print("\n[2/2] 导入教材改版数据...")
    cc_count = await import_curriculum_changes()
    print(f"  ✅ 导入改版数据 {cc_count} 条")

    print("\n" + "=" * 60)
    print(f"  完成! 共导入 {kp_count} 知识点 + {cc_count} 改版数据")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
