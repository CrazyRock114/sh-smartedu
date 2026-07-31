#!/usr/bin/env python3
"""W1 收尾：英语 G3/G5/G6 + 科学 G3-G6 种子生成"""
import json
from pathlib import Path
from urllib.parse import quote

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "videos"
# 2026-07-31 修正: 改用 searchPage (真实搜索结果页), 不再用 airClassRoom (?keyword= 会"暂无数据")
SEARCHPAGE = "https://basic.sh.smartedu.cn/airclassroom/searchPage"
AIRCLASS = "https://basic.sh.smartedu.cn/airclassroom/airClassRoom"

SUBJECT_LABELS = {"math": "数学", "chinese": "语文", "english": "英语", "science": "科学"}


def url(kw):
    return f"{SEARCHPAGE}?keyword={quote(kw)}"


def make_record(grade, subject, version, semester, chapter, episode, week, importance=3, kps=None):
    if kps is None:
        kps = []
    return {
        "grade": grade, "subject": subject, "version": version, "semester": semester,
        "chapter": chapter, "episode": episode,
        "search_url": url(episode),
        "chapter_listing_url": f"{SEARCHPAGE}?keyword={quote(chapter)}",
        "week_index": week, "importance": importance,
        "knowledge_point_codes": kps,
        "description": f"{version}{grade}年级{SUBJECT_LABELS[subject]}{semester} - {chapter}: {episode}",
        "verified": False,
    }


# 英语 G3 (人教PEP版 3上)
g3_eng_fall = [
    ("Unit 1·Hello", 1, 4, ["Hello!", "自我介绍", "字母Aa-Dd", "文具词汇"]),
    ("Unit 2·Colours", 3, 4, ["颜色词汇", "询问颜色", "字母Ee-Hh", "句型: What colour..."]),
    ("Unit 3·Look at me!", 5, 4, ["身体部位", "描述外貌", "字母Ii-Ll", "句型: Look at..."]),
    ("Unit 4·We love animals", 7, 4, ["动物词汇", "动物叫声", "字母Mm-Pp", "句型: I like..."]),
    ("Unit 5·Let's eat!", 9, 4, ["食物词汇", "餐具词汇", "字母Qq-Tt", "句型: Have some..."]),
    ("Unit 6·Happy birthday!", 12, 4, ["数字1-10", "生日词汇", "字母Uu-Xx", "询问年龄"]),
    ("Recycle 1", 14, 3, ["复习 Units 1-3", "复习 Units 4-6", "字母Yy-Zz"]),
]

g5_eng_fall = [
    ("Unit 1·What's he like?", 1, 4, ["人物外貌", "性格词汇", "句型: What's ...like?", "第三人称"]),
    ("Unit 2·My week", 3, 4, ["星期词汇", "课程词汇", "句型: What do you have...?", "一般现在时"]),
    ("Unit 3·What would you like?", 5, 4, ["食物词汇扩展", "句型: What would you like?", "回答 I'd like..."]),
    ("Unit 4·What can you do?", 7, 4, ["能力词汇", "句型: Can you...?", "回答 Yes/No"]),
    ("Unit 5·There is a big bed", 9, 4, ["房间物品", "方位介词", "句型: There is...", "描述房间"]),
    ("Unit 6·In a nature park", 12, 4, ["自然景物", "There be 句型", "一般疑问句", "描述公园"]),
    ("Recycle 2", 14, 3, ["复习 Units 1-3", "复习 Units 4-6", "综合应用"]),
]

g6_eng_fall = [
    ("Unit 1·How can I get there?", 1, 4, ["地点词汇", "指路用语", "句型: How can I get to...?", "方位介词"]),
    ("Unit 2·Ways to go to school", 3, 4, ["交通方式", "出行习惯", "句型: How do you go to...?", "频率副词"]),
    ("Unit 3·My weekend plan", 5, 4, ["周末活动", "计划将来", "句型: What are you going to do?", "be going to"]),
    ("Unit 4·I have a pen pal", 7, 4, ["兴趣爱好", "俱乐部", "句型: What's your hobby?", "一般现在时"]),
    ("Unit 5·What does he do?", 9, 4, ["职业词汇", "工作内容", "句型: What does he/she do?", "询问职业"]),
    ("Unit 6·How do you feel?", 12, 4, ["情绪词汇", "健康状况", "句型: How do you feel?", "should 情态动词"]),
    ("Recycle 3", 14, 3, ["复习 Units 1-3", "复习 Units 4-6", "综合应用"]),
]

# 科学 G3-G6 (教科版)
g3_sci = [
    ("第一单元·水", 1, 3, ["认识水", "水的变化", "水的三态"]),
    ("第二单元·空气", 3, 3, ["认识空气", "空气的性质", "空气的用途"]),
    ("第三单元·动物", 5, 3, ["常见动物", "动物的特征", "动物的分类"]),
    ("第四单元·植物", 7, 3, ["常见植物", "植物的根茎叶", "植物的生长"]),
    ("第五单元·物体与材料", 9, 3, ["物体的特征", "材料的性质", "材料的用途"]),
    ("第六单元·太阳与月亮", 12, 3, ["太阳", "月亮", "太阳与月亮的运动"]),
    ("第七单元·观察与测量", 15, 3, ["观察方法", "使用工具", "简单测量"]),
]
g4_sci = [
    ("第一单元·声音", 1, 3, ["声音的产生", "声音的传播", "声音的高低"]),
    ("第二单元·呼吸与消化", 3, 3, ["呼吸系统", "消化系统", "健康饮食"]),
    ("第三单元·运动和力", 5, 3, ["力与运动", "摩擦力", "重力"]),
    ("第四单元·简单电路", 7, 3, ["电的用途", "简单电路", "导体和绝缘体"]),
    ("第五单元·岩石与矿物", 9, 3, ["常见岩石", "矿物的特征", "岩石的用途"]),
    ("第六单元·地球与宇宙", 12, 3, ["地球形状", "昼夜变化", "四季形成"]),
    ("第七单元·物质的变化", 15, 3, ["物理变化", "化学变化", "物质的状态变化"]),
]
g5_sci = [
    ("第一单元·生物与环境", 1, 3, ["生物的特征", "生态系统的组成", "食物链与食物网"]),
    ("第二单元·光", 3, 3, ["光的传播", "光的反射", "光的折射"]),
    ("第三单元·地球的运动", 5, 3, ["地球自转", "地球公转", "昼夜与四季"]),
    ("第四单元·简单机械", 7, 3, ["杠杆", "滑轮", "轮轴"]),
    ("第五单元·健康与生活", 9, 3, ["传染病预防", "健康的生活方式", "急救常识"]),
    ("第六单元·地球表面", 12, 3, ["地形", "地貌", "地表的变化"]),
]
g6_sci = [
    ("第一单元·显微镜下的世界", 1, 3, ["细胞", "微生物", "微小世界"]),
    ("第二单元·物质的变化", 3, 3, ["物理变化", "化学变化", "物质的变化规律"]),
    ("第三单元·地球的运动", 5, 3, ["地球的公转", "四季的形成", "昼夜交替"]),
    ("第四单元·简单电路", 7, 3, ["电路图", "电路设计", "安全用电"]),
    ("第五单元·能量", 9, 3, ["能量的形式", "能量的转化", "能量的守恒"]),
    ("第六单元·地球与宇宙", 12, 3, ["太阳系", "恒星与行星", "宇宙的尺度"]),
]


SEEDS = [
    ("seed_g3_english_2025-fall.json", 3, "english", "人教PEP版", "2025-fall", g3_eng_fall),
    ("seed_g5_english_2025-fall.json", 5, "english", "人教PEP版", "2025-fall", g5_eng_fall),
    ("seed_g6_english_2025-fall.json", 6, "english", "人教PEP版", "2025-fall", g6_eng_fall),
    ("seed_g3_science_2025-fall.json", 3, "science", "教科版", "2025-fall", g3_sci),
    ("seed_g4_science_2025-fall.json", 4, "science", "教科版", "2025-fall", g4_sci),
    ("seed_g5_science_2025-fall.json", 5, "science", "教科版", "2025-fall", g5_sci),
    ("seed_g6_science_2025-fall.json", 6, "science", "教科版", "2025-fall", g6_sci),
]

for fname, g, sub, ver, sem, chapters in SEEDS:
    videos = []
    for ch, week, imp, eps in chapters:
        for ep in eps:
            videos.append(make_record(g, sub, ver, sem, ch, ep, week, imp))
    payload = {
        "version": "1.0",
        "updated_at": "2026-07-31",
        "note": f"{ver}{g}年级{SUBJECT_LABELS[sub]}{sem} 空中课堂微课索引。每条 episode 是搜索关键词, 朋友点开跳到 basic.sh.smartedu.cn。",
        "source": AIRCLASS,
        "videos": videos,
    }
    (OUT_DIR / fname).write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"  ✓ {fname}: {len(videos)} videos ({len(chapters)} chapters)")

print(f"\n📦 {len(SEEDS)} files")
