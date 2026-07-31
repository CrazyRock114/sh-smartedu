"""加载 smartedu 真实微课 JSON 到 DB (idempotent upsert)

用法:
    cd backend && venv/bin/python scripts/load_smartedu_videos.py

源: data/videos/smartedu_real/smartedu_*.json (来自 scripts/fetch_smartedu_videos.py)
目标: smartedu_videos 表 (upsert by resource_id)
"""
import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from uuid import UUID

from sqlalchemy import select

from app.core.db import AsyncSessionLocal, engine, Base
from app.models.smartedu_video import SmartEduVideo

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("load_smartedu")

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "videos" / "smartedu_real"


async def main():
    # 1) 确保表存在
    log.info("create_all smartedu_videos 表")
    async with engine.begin() as conn:
        # 触发 model metadata
        from app.models.smartedu_video import SmartEduVideo  # noqa
        await conn.run_sync(Base.metadata.create_all, tables=[SmartEduVideo.__table__])

    # 2) 读所有 JSON
    files = sorted(DATA_DIR.glob("smartedu_*.json"))
    log.info(f"发现 {len(files)} 个 JSON 文件")

    total_created = 0
    total_updated = 0
    total_skipped = 0

    async with AsyncSessionLocal() as session:
        for fp in files:
            try:
                data = json.load(open(fp, encoding="utf-8"))
            except Exception as e:
                log.warning(f"读 {fp.name} 失败: {e}")
                continue

            videos = data.get("videos", [])
            log.info(f"  {fp.name}: {len(videos)} videos")

            for v in videos:
                rid = v.get("resource_id")
                if not rid:
                    total_skipped += 1
                    continue
                # upsert
                stmt = select(SmartEduVideo).where(SmartEduVideo.resource_id == rid)
                existing = (await session.execute(stmt)).scalar_one_or_none()
                release_time = None
                if v.get("release_time"):
                    try:
                        release_time = datetime.fromisoformat(v["release_time"].replace(" ", "T"))
                    except Exception:
                        pass
                if existing:
                    # update
                    existing.grade = v.get("grade", existing.grade)
                    existing.subject = v.get("subject", existing.subject)
                    existing.subject_label = v.get("subject_label", existing.subject_label)
                    existing.version = v.get("version", existing.version)
                    existing.version_label = v.get("version_label", existing.version_label)
                    existing.semester = v.get("term", existing.semester)
                    existing.term_label = v.get("term_label", existing.term_label)
                    existing.subject_id = v.get("subject_id", existing.subject_id)
                    existing.title = v.get("title", existing.title)
                    existing.school = v.get("school", existing.school)
                    existing.teacher = v.get("teacher", existing.teacher)
                    existing.upload_file_name = v.get("upload_file_name", existing.upload_file_name)
                    if release_time:
                        existing.release_time = release_time
                    existing.video_url = v.get("video_url", existing.video_url)
                    existing.direct_url = v.get("direct_url", existing.direct_url)
                    total_updated += 1
                else:
                    # create
                    sv = SmartEduVideo(
                        grade=v.get("grade", 0),
                        subject=v.get("subject", ""),
                        subject_label=v.get("subject_label", ""),
                        version=v.get("version", ""),
                        version_label=v.get("version_label", ""),
                        semester=v.get("term", ""),
                        term_label=v.get("term_label", ""),
                        resource_id=rid,
                        subject_id=v.get("subject_id", ""),
                        title=v.get("title", ""),
                        school=v.get("school"),
                        teacher=v.get("teacher"),
                        upload_file_name=v.get("upload_file_name"),
                        release_time=release_time,
                        video_url=v.get("video_url"),
                        direct_url=v.get("direct_url", ""),
                        importance=3,
                        verified=True,
                    )
                    session.add(sv)
                    total_created += 1
            await session.commit()

    log.info(f"=== 完成: created={total_created}, updated={total_updated}, skipped={total_skipped} ===")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
