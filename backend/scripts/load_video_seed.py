#!/usr/bin/env python3
"""加载 weekly_videos 种子数据 (来自 data/videos/*.json)

idempotent: 已存在 (按 chapter+episode 判重) 跳过, 不存在则新增
"""
import asyncio
import json
import os
import sys
from pathlib import Path

# 让脚本能 import app.*
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from app.core.db import AsyncSessionLocal
from app.models.weekly_video import WeeklyVideo


DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "videos"


async def load_one(session, video: dict) -> str:
    """加载一条; 返回 'created' | 'skipped'"""
    stmt = select(WeeklyVideo).where(
        WeeklyVideo.grade == video["grade"],
        WeeklyVideo.subject == video["subject"],
        WeeklyVideo.version == video["version"],
        WeeklyVideo.semester == video["semester"],
        WeeklyVideo.chapter == video["chapter"],
        WeeklyVideo.episode == video["episode"],
    )
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        # 顺便更新 direct_url / description (可能新增)
        for f in ("direct_url", "search_url", "chapter_listing_url",
                  "teacher", "school", "duration", "description", "verified"):
            if f in video and getattr(existing, f) != video[f]:
                setattr(existing, f, video[f])
        if "knowledge_point_codes" in video:
            existing.knowledge_point_codes = video["knowledge_point_codes"]
        if "week_index" in video:
            existing.week_index = video["week_index"]
        if "importance" in video:
            existing.importance = video["importance"]
        return "updated"
    obj = WeeklyVideo(
        grade=video["grade"],
        subject=video["subject"],
        version=video["version"],
        semester=video["semester"],
        chapter=video["chapter"],
        episode=video["episode"],
        teacher=video.get("teacher"),
        school=video.get("school"),
        duration=video.get("duration"),
        direct_url=video.get("direct_url"),
        search_url=video.get("search_url"),
        chapter_listing_url=video.get("chapter_listing_url"),
        week_index=video.get("week_index"),
        importance=video.get("importance", 3),
        knowledge_point_codes=video.get("knowledge_point_codes", []),
        description=video.get("description"),
        source=video.get("source", "basic.sh.smartedu.cn"),
        verified=video.get("verified", False),
    )
    session.add(obj)
    return "created"


async def main():
    files = sorted(DATA_DIR.glob("seed_*.json"))
    if not files:
        print(f"❌ No seed_*.json in {DATA_DIR}")
        return
    print(f"📂 Found {len(files)} seed file(s) in {DATA_DIR}")
    total = {"created": 0, "updated": 0}
    async with AsyncSessionLocal() as session:
        for path in files:
            with open(path) as f:
                data = json.load(f)
            videos = data.get("videos", [])
            print(f"  · {path.name}: {len(videos)} videos")
            for v in videos:
                status = await load_one(session, v)
                total[status] = total.get(status, 0) + 1
        await session.commit()
    print(f"\n✅ Done. created={total['created']}, updated={total['updated']}")


if __name__ == "__main__":
    asyncio.run(main())
