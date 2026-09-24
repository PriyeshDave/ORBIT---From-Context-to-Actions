"""
Shared LLM invocation helper. Every agent (and the orchestrator) goes through
this single function so that prompt loading, OpenAI calls, JSON parsing,
latency measurement and token accounting are consistent and only implemented
once - this is also the single point LangSmith tracing hooks into via
langchain_openai's ChatOpenAI, since LangGraph/LangChain auto-trace any
ChatOpenAI invocation when LANGCHAIN_TRACING_V2=true.
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from langchain_openai import ChatOpenAI

from app.shared.config import get_settings
from app.readiness.schemas import TokenUsage
from app.readiness.observability.metrics import compute_cost

settings = get_settings()
PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

_llm_cache: dict[str, ChatOpenAI] = {}


def _get_llm(model: str) -> ChatOpenAI:
    if model not in _llm_cache:
        _llm_cache[model] = ChatOpenAI(model=model, api_key=settings.openai_api_key, temperature=0.2)
    return _llm_cache[model]


def load_prompt(template_name: str, **variables: str) -> str:
    path = PROMPTS_DIR / f"{template_name}.md"
    raw = path.read_text(encoding="utf-8")
    body = re.sub(r"^---.*?---\s*", "", raw, flags=re.DOTALL)
    try:
        return body.format(**variables)
    except KeyError as exc:
        raise ValueError(f"Missing variable {exc} for prompt template '{template_name}'") from exc


def extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text).rstrip("`").strip()
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM response: {text[:200]}")
    return json.loads(match.group(0))


async def call_llm_json(template_name: str, is_orchestrator: bool = False, **variables: str) -> tuple[dict, TokenUsage, float, str]:
    model = settings.openai_orchestrator_model if is_orchestrator else settings.openai_model
    prompt = load_prompt(template_name, **variables)
    llm = _get_llm(model)

    start = time.perf_counter()
    response = await llm.ainvoke(prompt)
    latency_ms = (time.perf_counter() - start) * 1000

    usage_meta = getattr(response, "usage_metadata", None) or {}
    input_tokens = usage_meta.get("input_tokens", 0)
    output_tokens = usage_meta.get("output_tokens", 0)
    token_usage = TokenUsage(
        input_tokens=input_tokens, output_tokens=output_tokens,
        total_tokens=input_tokens + output_tokens,
        cost_usd=compute_cost(input_tokens, output_tokens, is_orchestrator),
    )

    parsed = extract_json(response.content)
    return parsed, token_usage, latency_ms, model
