# 豆包 API 服务 - 用于生成文章 AI 摘要
import re
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# 摘要最大长度（与 articles.ai_summary 字段一致）
AI_SUMMARY_MAX_LENGTH = 1000


def _strip_html(text):
    """去除 HTML 标签，保留纯文本"""
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:8000]  # 限制送入 API 的文本长度，避免超长


def generate_ai_summary(title, content_text):
    """
    使用豆包 API 根据文章标题和正文生成摘要。
    若 API 调用失败则返回 None，调用方需处理。
    """
    api_key = (getattr(settings, 'DOUBAO_API_KEY', None) or '').strip()
    base_url = (getattr(settings, 'DOUBAO_API_BASE_URL', None) or '').strip() or 'https://ark.cn-beijing.volces.com/api/v3'
    model = (getattr(settings, 'DOUBAO_MODEL', None) or '').strip()

    if not api_key:
        logger.warning('DOUBAO_API_KEY 未配置（请设置环境变量 DOUBAO_API_KEY），无法生成 AI 摘要')
        return None
    if not model:
        logger.warning('DOUBAO_MODEL 未配置（火山方舟需填接入点 ID，如 ep-xxx），无法生成 AI 摘要')
        return None

    text = _strip_html(content_text) or ''
    if not text and not title:
        return None

    prompt = f"""请根据以下文章标题和正文，用简洁的中文写一段摘要，概括核心内容。要求：
1. 控制在 300 字以内；
2. 不要复述标题，直接概括正文要点；
3. 只输出摘要正文，不要输出“摘要：”等前缀。

标题：{title or '（无标题）'}

正文：
{text[:6000]}
"""
    # 若 base_url 已包含 /chat/completions 则直接使用，否则拼接
    base_url = base_url.rstrip('/')
    if '/chat/completions' in base_url:
        url = base_url
    else:
        url = f'{base_url}/chat/completions'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
    }
    payload = {
        'model': model,
        'messages': [{'role': 'user', 'content': prompt}],
        'max_tokens': 500,
        'temperature': 0.3,
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        choices = data.get('choices') or []
        if not choices:
            logger.warning('豆包 API 返回无 choices: %s', data)
            return None
        content = (choices[0].get('message') or {}).get('content') or ''
        content = content.strip()
        if not content:
            return None
        return content[:AI_SUMMARY_MAX_LENGTH]
    except requests.RequestException as e:
        logger.exception('豆包 API 请求失败: %s', e)
        return None
    except (ValueError, KeyError) as e:
        logger.exception('豆包 API 响应解析失败: %s', e)
        return None
