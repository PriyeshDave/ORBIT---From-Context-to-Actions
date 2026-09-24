"""
Telemetry layer shared by Catch Up and Planner. Computes cost from real
token usage against data/pricing.json, and optionally wraps calls with
LangSmith's standalone `traceable` decorator if configured - the app works
identically without it, just without trace links. Readiness has its own
tracing module (app/readiness/orchestrator/tracing.py) since it integrates
with LangGraph/LangChain's native tracing instead of wrapping plain
functions.
"""
import json
import os
from pathlib import Path
from typing import Callable, Optional

from app.shared.config import get_settings
from app.shared.schemas import LLMCallTelemetry
from app.shared.openai_client import LLMCallResult

settings = get_settings()
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

_pricing_cache: Optional[dict] = None

_langsmith_traceable = None
if settings.langsmith_enabled:
    try:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
        os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
        os.environ["LANGCHAIN_ENDPOINT"] = settings.langchain_endpoint

        from langsmith import traceable as _traceable_import
        _langsmith_traceable = _traceable_import
    except ImportError:
        _langsmith_traceable = None


def _load_pricing() -> dict:
    global _pricing_cache
    if _pricing_cache is None:
        with open(DATA_DIR / "pricing.json", "r", encoding="utf-8") as f:
            _pricing_cache = json.load(f)
    return _pricing_cache


def compute_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    pricing = _load_pricing()
    rates = pricing.get(model, pricing["_default"])
    cost = (prompt_tokens / 1000) * rates["input_per_1k"] + (completion_tokens / 1000) * rates["output_per_1k"]
    return round(cost, 6)


def wrap_traceable(name: str, fn: Callable) -> Callable:
    if _langsmith_traceable is not None:
        return _langsmith_traceable(name=name, run_type="llm")(fn)
    return fn


def build_telemetry(label: str, result: LLMCallResult, trace_url: Optional[str] = None) -> LLMCallTelemetry:
    cost = compute_cost_usd(result.model, result.prompt_tokens, result.completion_tokens)
    return LLMCallTelemetry(
        label=label,
        model=result.model,
        prompt_tokens=result.prompt_tokens,
        completion_tokens=result.completion_tokens,
        total_tokens=result.total_tokens,
        latency_ms=result.latency_ms,
        cost_usd=cost,
        langsmith_trace_url=trace_url,
        langsmith_enabled=settings.langsmith_enabled,
    )


def langsmith_project_url() -> Optional[str]:
    if not settings.langsmith_enabled:
        return None
    return f"https://smith.langchain.com/o/-/projects/p/{settings.langchain_project}"
