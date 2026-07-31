"""数据库初始化 (dev 阶段: 用 SQLAlchemy create_all 直接建表)

用法:
    cd backend && venv/bin/python -m scripts.init_db

生产环境应该用 alembic migration, 这里只是 dev 快速建表。
"""
import asyncio
import logging
import sys

from app.core.db import Base, engine
# 触发所有模型的导入, 否则 create_all 找不到表
from app.models import (  # noqa: F401
    Child,
    CurriculumChange,
    ErrorItem,
    Family,
    KnowledgePoint,
    MasteryState,
    PushRecord,
    ReviewQueueItem,
    StudyRecord,
    WeeklyVideo,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("init_db")


async def main() -> int:
    log.info("连接数据库...")
    try:
        async with engine.begin() as conn:
            log.info(f"建表 ({len(Base.metadata.tables)} 张)...")
            await conn.run_sync(Base.metadata.create_all)
        log.info("✅ 全部表建好")
        for table_name in sorted(Base.metadata.tables.keys()):
            log.info(f"  - {table_name}")
        return 0
    except Exception as e:
        log.error(f"❌ 建表失败: {e}")
        return 1
    finally:
        await engine.dispose()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
