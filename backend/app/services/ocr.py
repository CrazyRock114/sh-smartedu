"""OCR + 拍照归因 (智谱 GLM-4V 多模态)

优势: 一个 API 干两件事 — OCR 读题 + AI 归因.
前提: 配 ZHIPU_API_KEY (智谱 GLM-4V 开放平台).

未配 key 时, 整个模块 import 也不报错, 调用直接返回 None + 明确错误.
"""
import base64
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)


def is_available() -> bool:
    """OCR 服务是否可用 (有 key + 装了 zhipuai)"""
    if not (os.environ.get("ZHIPUAI_API_KEY") or os.environ.get("GLM_API_KEY") or os.environ.get("ZHIPU_API_KEY")):
        return False
    try:
        import zhipuai  # noqa
        return True
    except ImportError:
        return False


def _get_client():
    """懒加载 zhipu 客户端"""
    api_key = os.environ.get("ZHIPUAI_API_KEY") or os.environ.get("GLM_API_KEY") or os.environ.get("ZHIPU_API_KEY")
    from zhipuai import ZhipuAI
    return ZhipuAI(api_key=api_key)


async def ocr_and_attribute(
    image_bytes: bytes,
    image_mime: str = "image/jpeg",
    hint_subject: Optional[str] = None,
) -> Optional[dict]:
    """拍照 → 读出题目 + 学生答案 + AI 归因

    Args:
        image_bytes: 图片二进制 (jpg/png/webp)
        image_mime: MIME 类型
        hint_subject: 学科提示 ("math"/"chinese"/"english"/"science")

    Returns:
        {
            "question_text": str,        # 题目文字
            "student_answer": str,       # 学生写的答案 (从图里识别)
            "error_type": str,           # CARELESS / READING_WRONG / ... / OTHER
            "reason": str,               # AI 推断说明
            "correct_answer": str,       # 留空 (AI 不知道正确答案)
            "source": "glm-4v",
        }
        或 None (服务不可用/失败)
    """
    if not is_available():
        return None

    try:
        client = _get_client()
        b64 = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{image_mime};base64,{b64}"

        subject_hint = f"\n学科提示: {hint_subject}" if hint_subject else ""
        prompt = f"""这是一道小学生的错题照片。请:
1. 识别图中的【题目原文】
2. 识别【学生写的答案】(孩子在题目下方手写的部分)
3. 推断【错因】, 从以下 7 类选一个最匹配的:
   - CARELESS       粗心/计算错 (算错、抄错、忘进位等)
   - READING_WRONG  审题错 (没看清、看错条件)
   - METHOD_WRONG   方法错 (用错公式、列错方程、思路不对)
   - CONCEPT_CONFUSE 概念混 (混淆相似概念, 如周长vs面积)
   - KNOWLEDGE_GAP  知识缺失 (没学过/忘了)
   - TIME_PRESSURE  速度慢 (来不及做完)
   - OTHER          其他
4. 给一句简短理由{subject_hint}

严格只输出一个 JSON (不要 Markdown 不要解释):
{{"question_text": "<题目原文>", "student_answer": "<学生答案>", "error_type": "<枚举值>", "reason": "<一句话理由>"}}"""

        resp = client.chat.completions.create(
            model="glm-4v-flash",  # 视觉模型, 1 跳读图
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": data_url}},
                    {"type": "text", "text": prompt},
                ],
            }],
            temperature=0.1,
            max_tokens=600,
        )
        content = (resp.choices[0].message.content or "").strip()
        # 容忍 ```json ... ``` 包裹
        match = re.search(r"\{[\s\S]+\}", content)
        if not match:
            logger.warning(f"GLM-4V no JSON: {content[:200]!r}")
            return None
        import json
        obj = json.loads(match.group(0))
        et = (obj.get("error_type") or "").upper()
        if et not in {"CARELESS", "READING_WRONG", "METHOD_WRONG", "CONCEPT_CONFUSE", "KNOWLEDGE_GAP", "TIME_PRESSURE", "OTHER"}:
            et = "OTHER"
        return {
            "question_text": (obj.get("question_text") or "").strip(),
            "student_answer": (obj.get("student_answer") or "").strip(),
            "correct_answer": "",  # AI 不知道答案, 让家长填
            "error_type": et,
            "reason": (obj.get("reason") or "").strip(),
            "source": "glm-4v",
        }
    except Exception as e:
        logger.warning(f"GLM-4V ocr_and_attribute failed: {e}")
        return None


__all__ = ["is_available", "ocr_and_attribute"]
