"""错因归因器 (启发式规则版 + GLM 接口)

7 类错因 (定义见 app.models.error_item.ERROR_TYPES):
- CARELESS         粗心/计算错
- READING_WRONG    审题错
- METHOD_WRONG     方法错
- CONCEPT_CONFUSE  概念混
- KNOWLEDGE_GAP    知识缺失
- TIME_PRESSURE    速度慢 (从家长备注或答题时间推断)
- OTHER            其他

策略:
1. 优先用 GLM (智谱 GLM-4) 归因, 等待结果时给"启发式"占位
2. GLM 失败/未配 key 时, 降级到关键词规则 (粗略但能用)
3. 永远让家长可改, 不要硬塞一个归因结果
"""
import logging
import os
import re
from typing import Optional

from app.models.error_item import ERROR_TYPES

logger = logging.getLogger(__name__)


# === 规则版归因 (fallback) ===

# 关键词 → 错因映射 (按优先级排, 先匹配先赢)
# 注意: 孩子题干里的词容易跟家长备注混, 所以同时扫 question + correct/student + note
_KEYWORD_RULES: list[tuple[str, str]] = [
    # 审题
    (r"没看清|没看到|漏看|读错题|看成|以为是|审题", "READING_WRONG"),
    # 粗心 / 计算
    (r"算错|计算错|粗心|看错数|抄错|忘加|漏写|忘带进位|忘退位|忘乘|忘除", "CARELESS"),
    # 知识缺失 (最常见的"不会"信号)
    (r"不会|不懂|没学过|忘了|记不住|不清楚|不知道", "KNOWLEDGE_GAP"),
    # 方法错
    (r"方法|用错|列式|公式|不会列|不会设|思路", "METHOD_WRONG"),
    # 概念混
    (r"混淆|搞混|分不清|和.*的区别|以为是.*其实是", "CONCEPT_CONFUSE"),
    # 速度慢
    (r"太慢|来不及|时间不够|速度慢|超时", "TIME_PRESSURE"),
]


def _classify_by_rules(text: str) -> tuple[str, str]:
    """关键词规则归因, 返回 (error_type, 命中规则描述)"""
    for pattern, error_type in _KEYWORD_RULES:
        if re.search(pattern, text):
            return error_type, f"规则: 命中 {pattern}"
    return "OTHER", "规则: 无命中"


# === GLM 归因 (优先, 失败降级) ===

async def classify_by_glm(
    question: str,
    correct_answer: str,
    student_answer: str,
    note: Optional[str] = None,
) -> Optional[tuple[str, str]]:
    """用 GLM-4 归因; 失败/未配 key 返回 None (调用方降级到规则).

    Returns: (error_type, 推理说明) 或 None
    """
    api_key = os.environ.get("ZHIPUAI_API_KEY") or os.environ.get("GLM_API_KEY")
    if not api_key:
        return None  # 没配 key, 降级

    try:
        # 延迟导入 — 没装 zhipu 也能跑 (关键词规则足够 MVP)
        from zhipuai import ZhipuAI
    except ImportError:
        logger.warning("zhipuai not installed, skip GLM classify")
        return None

    prompt = f"""你是一个小学数学错因分析助手。请根据以下信息,从 7 个错因里选最匹配的一个。

7 个错因:
- CARELESS         粗心/计算错 (算错、抄错、忘进位等)
- READING_WRONG    审题错 (没看清题目、看错条件)
- METHOD_WRONG     方法错 (用错公式、列错方程、思路不对)
- CONCEPT_CONFUSE  概念混 (混淆相似概念, 如周长vs面积)
- KNOWLEDGE_GAP    知识缺失 (没学过/忘了)
- TIME_PRESSURE    速度慢 (来不及做完)
- OTHER            其他

【题目】{question[:500]}
【正确答案】{correct_answer[:300]}
【学生答案】{student_answer[:300]}
【家长备注】{note or '(无)'}

只输出一个 JSON, 严格按格式: {{"error_type": "<枚举值>", "reason": "<一句话理由>"}}
不要解释,不要 Markdown。"""

    try:
        client = ZhipuAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="glm-4-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=200,
        )
        content = resp.choices[0].message.content or ""
        # 抽 JSON (容忍 ```json 包裹)
        match = re.search(r"\{[^{}]+\}", content)
        if not match:
            logger.warning(f"GLM returned no JSON: {content!r}")
            return None
        import json
        obj = json.loads(match.group(0))
        et = obj.get("error_type", "").upper()
        if et not in ERROR_TYPES:
            logger.warning(f"GLM returned invalid error_type: {et}")
            return None
        return et, obj.get("reason", "")
    except Exception as e:
        logger.warning(f"GLM classify failed: {e}")
        return None


# === 对外接口 ===

async def suggest_error_type(
    question: str,
    correct_answer: str,
    student_answer: str,
    note: Optional[str] = None,
) -> tuple[str, str, str]:
    """建议错因

    Returns: (error_type, reason, source)
        source: "glm" | "rule" | "manual_required"
    """
    text = f"{question} {correct_answer} {student_answer} {note or ''}"

    # 1. 尝试 GLM
    glm_result = await classify_by_glm(question, correct_answer, student_answer, note)
    if glm_result is not None:
        return glm_result[0], glm_result[1], "glm"

    # 2. 关键词规则
    et, reason = _classify_by_rules(text)
    return et, reason, "rule"


# === 给前端展示的错因中文标签 ===

ERROR_TYPE_LABELS: dict[str, str] = {
    "CARELESS": "粗心/计算错",
    "READING_WRONG": "审题错",
    "METHOD_WRONG": "方法错",
    "CONCEPT_CONFUSE": "概念混",
    "KNOWLEDGE_GAP": "知识缺失",
    "TIME_PRESSURE": "速度慢",
    "OTHER": "其他",
}


def label_for(error_type: str) -> str:
    return ERROR_TYPE_LABELS.get(error_type, error_type)


__all__ = [
    "suggest_error_type",
    "label_for",
    "ERROR_TYPE_LABELS",
    "ERROR_TYPES",
]
