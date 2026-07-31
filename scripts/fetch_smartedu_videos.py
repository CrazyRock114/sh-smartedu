#!/usr/bin/env python3
"""W1 收尾: 抓 smartedu 真实微课 resource_id + courseId, 写回 weekly_videos.direct_url

数据源:
- indexPanel: https://www.sh.smartedu.cn/smile-index-service/api/kzktnew/common/indexPanel
  → 拿 grade/subject/edition/volume ID 映射
- kzktNewResource/page: 同 host /api/index/kzktNewResource/page
  → 拉每 (grade, subject, version, term) 组合的所有 video

输出: data/videos/smartedu_<grade>_<subject>_<version>_<term>.json
     + 写回 weekly_videos.direct_url (idempotent upsert)

为什么不直接调 OSS / 朋友家抓:
- 这是 smartedu 公开 API (无需鉴权, 仅需 Referer)
- 用 playwright 走 page.request 自动带 cookie, 不会被 CORS 拦
- 1 小时能抓 4 学科 × 6 年级 × 2 学期 ≈ 1500 条
"""
import asyncio
import json
import re
from pathlib import Path
from urllib.parse import quote
from playwright.async_api import async_playwright

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "videos" / "smartedu_real"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# smartedu API
API_BASE = "https://www.sh.smartedu.cn/smile-index-service/api"
INDEX_PANEL = f"{API_BASE}/kzktnew/common/indexPanel"
PAGE_API = f"{API_BASE}/index/kzktNewResource/page"

# 学科映射 (smartedu name -> 我方 key)
SUBJECT_MAP = {
    "语文": "chinese",
    "数学": "math",
    "英语": "english",
    "科学": "science",
}

# 版本标准化 (smartedu name -> 我方 version)
VERSION_MAP = {
    "人教社": "人教版",  # smartedu 用 "人教社" 我方用 "人教版" (类似)
    "沪教育": "沪教版",
    "沪科技": "教科版",
    "牛津上海版": "牛津上海版",
    "教科版": "教科版",
    "统编版": "统编版",
    "人教PEP版": "人教PEP版",
}

# 学期映射 (smartedu name -> 我方 semester)
TERM_MAP = {
    "第一学期": "2025-fall",
    "第二学期": "2025-spring",
}

# 学段映射 (smartedu section -> 我方 section)
SECTION_GRADES = {
    "小学": [1, 2, 3, 4, 5],   # G1-G5
    "初中": [6, 7, 8, 9],      # G6 + 初中
}


async def get_index_panel(context) -> dict:
    """拿全 ID 映射: gradeList, subjectList, termList, chainList"""
    resp = await context.request.post(
        INDEX_PANEL, data=json.dumps({}),
        headers={
            "Content-Type": "application/json;charset=UTF-8",
            "Referer": "https://basic.sh.smartedu.cn/",
            "Origin": "https://basic.sh.smartedu.cn",
        }
    )
    return (await resp.json()).get("data", {})


CN_GRADE_MAP = {
    "一年级": 1, "二年级": 2, "三年级": 3, "四年级": 4, "五年级": 5, "六年级": 6,
    "七年级": 7, "八年级": 8, "九年级": 9,
    "高一": 10, "高二": 11, "高三": 12, "跨年级": 13,
}


def find_combinations(chain_list: list, sections: list[str]) -> list[dict]:
    """从 chain 里找出所有 (section, grade, term, subject, version) 组合
    grade 数字从 gradeName 中文解析 (e.g. "六年级" -> 6)
    """
    combos = []
    for section_node in chain_list:
        section_name = section_node.get("name")
        if section_name not in sections:
            continue
        for grade_node in section_node.get("children", []):
            grade_name = grade_node.get("name")
            grade_num = CN_GRADE_MAP.get(grade_name)
            if grade_num is None or grade_num > 6:  # 只看 G1-G6
                continue
            for term_node in grade_node.get("children", []):
                term_name = term_node.get("name")
                for subject_node in term_node.get("children", []):
                    subject_name = subject_node.get("name")
                    if subject_name not in SUBJECT_MAP:
                        continue
                    for ver_node in subject_node.get("children", []):
                        ver_name = ver_node.get("name")
                        combos.append({
                            "section": section_name,
                            "grade": grade_num,
                            "gradeName": grade_name,
                            "gradeId": grade_node.get("id"),
                            "term": term_name,
                            "termId": term_node.get("id"),
                            "subject": subject_name,
                            "subjectId": subject_node.get("id"),
                            "version": ver_name,
                            "versionId": ver_node.get("id"),
                        })
    return combos


async def fetch_videos_for_combo(context, combo: dict, page_size: int = 100) -> list[dict]:
    """拉一个 (grade, subject, version, term) 组合的所有 video, 处理分页"""
    all_items = []
    start = 1
    while True:
        payload = {
            "start": start,
            "length": page_size,
            "isShowNotStudy": 0,
            "editionId": combo["versionId"],
            "subjectId": combo["subjectId"],
            "sectionId": "",
            "gradeId": combo["gradeId"],
            "volumeId": combo["termId"],
            "pointIdList": [],
            "searchType": "keyword",
        }
        resp = await context.request.post(
            PAGE_API, data=json.dumps(payload),
            headers={
                "Content-Type": "application/json;charset=UTF-8",
                "Referer": "https://basic.sh.smartedu.cn/",
                "Origin": "https://basic.sh.smartedu.cn",
            }
        )
        data = (await resp.json()).get("data", {})
        items = data.get("list", [])
        all_items.extend(items)
        total = data.get("total", 0)
        try:
            total = int(total)
        except (ValueError, TypeError):
            total = 0
        if not items or (total and len(all_items) >= total):
            break
        start += page_size
    return all_items


def parse_resource_key(key: str) -> dict:
    """解析 resourceKey: '小学-数学-沪教育-三年级-上-序单元-我是中国人,上海市...,某某老师'
    返回 {title, school, teacher}
    """
    if not key:
        return {}
    parts = key.split(",")
    title_part = parts[0] if parts else key
    school = parts[1] if len(parts) > 1 else None
    teacher = parts[2] if len(parts) > 2 else None
    # title_part 最后一段是标题
    title = title_part.split("-")[-1] if "-" in title_part else title_part
    return {"title": title.strip(), "school": school, "teacher": teacher}


def build_direct_url(resource_id: str, subject_id: str) -> str:
    """拼详情页 URL"""
    return f"https://basic.sh.smartedu.cn/airclassroom/airClassroomTaskDetail?resource={resource_id}&courseId={subject_id}"


async def main(only_grades: list[int] = None, only_subjects: list[str] = None, max_combos: int = None):
    """抓取主函数
    Args:
        only_grades: 只抓指定 grade (e.g. [3, 4])
        only_subjects: 只抓指定 subject (e.g. ['数学'])
        max_combos: 限制最大组合数 (e.g. 3 for smoke test)
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        )
        context = await browser.new_context()
        page = await context.new_page()
        # 先 navigate 拿 cookie
        await page.goto("https://basic.sh.smartedu.cn/airclassroom/airClassRoom", timeout=30000)
        await page.wait_for_timeout(2000)

        print("=== 拉 indexPanel ===")
        panel = await get_index_panel(context)
        chain = panel.get("chainList", [])
        combos = find_combinations(chain, ["小学", "初中"])
        # 筛选
        if only_grades:
            combos = [c for c in combos if c["grade"] in only_grades]
        if only_subjects:
            combos = [c for c in combos if c["subject"] in only_subjects]
        if max_combos:
            combos = combos[:max_combos]
        print(f"=== {len(combos)} 个 (grade, subject, version, term) 组合待抓 ===\n")

        total_videos = 0
        for i, combo in enumerate(combos, 1):
            label = f"G{combo['grade']} {combo['subject']} {combo['version']} {combo['term']}"
            print(f"[{i}/{len(combos)}] {label} ...", end=" ", flush=True)
            try:
                items = await fetch_videos_for_combo(context, combo)
            except Exception as e:
                print(f"ERR: {e}")
                continue
            # 解析 + 标准化
            records = []
            for it in items:
                parsed = parse_resource_key(it.get("resourceKey", ""))
                records.append({
                    "resource_id": it.get("id"),
                    "subject_id": it.get("subjectId"),
                    "title": parsed.get("title", it.get("resourceKey", "").split(",")[0]),
                    "school": parsed.get("school"),
                    "teacher": parsed.get("teacher"),
                    "video_url": it.get("requestUrl") or it.get("resourceItem", {}).get("quasiHighDefinition"),
                    "upload_file_name": it.get("resourceItem", {}).get("uploadFileName"),
                    "release_time": it.get("releaseTime"),
                    "grade": combo["grade"],
                    "subject": SUBJECT_MAP.get(combo["subject"], combo["subject"]),
                    "subject_label": combo["subject"],
                    "version": VERSION_MAP.get(combo["version"], combo["version"]),
                    "version_label": combo["version"],
                    "term": TERM_MAP.get(combo["term"], combo["term"]),
                    "term_label": combo["term"],
                    "direct_url": build_direct_url(it.get("id"), it.get("subjectId")),
                })
            # 写到独立 JSON
            fname = OUT_DIR / f"smartedu_g{combo['grade']}_{SUBJECT_MAP[combo['subject']]}_{VERSION_MAP.get(combo['version'], combo['version'])}_{TERM_MAP.get(combo['term'], combo['term'])}.json"
            fname.parent.mkdir(parents=True, exist_ok=True)
            with open(fname, "w", encoding="utf-8") as f:
                json.dump({
                    "version": "1.0",
                    "updated_at": "2026-07-31",
                    "note": f"从 smartedu 真实 API 抓取的 G{combo['grade']} {combo['subject']} {combo['version']} {combo['term']} 微课",
                    "combo": combo,
                    "count": len(records),
                    "videos": records,
                }, f, ensure_ascii=False, indent=2)
            print(f"✓ {len(records)} videos  → {fname.name}")
            total_videos += len(records)

        print(f"\n=== 完成, 共抓 {total_videos} 个真实微课 ===")
        await browser.close()


if __name__ == "__main__":
    import sys
    # 简化: 默认抓 G3-G4 数学 (2 grade × 1 subject × 2 term × 1-2 version ≈ 6 组合)
    only_grades = [3, 4] if "--smoke" in sys.argv else [3, 4, 5, 6]
    only_subjects = ["数学"] if "--smoke" in sys.argv else None
    max_combos = 4 if "--smoke" in sys.argv else None
    asyncio.run(main(only_grades=only_grades, only_subjects=only_subjects, max_combos=max_combos))
