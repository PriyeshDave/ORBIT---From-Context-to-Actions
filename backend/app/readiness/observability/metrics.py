"""
Token/cost accounting shared by every agent + orchestrator call, and a small
in-memory run registry so the /flow page can fetch a completed run's full
trace even after the WebSocket connection that streamed it has closed.
"""
from __future__ import annotations

from app.shared.config import get_settings
from app.readiness.schemas import TokenUsage, TraceEvent

settings = get_settings()


def compute_cost(input_tokens: int, output_tokens: int, is_orchestrator: bool = False) -> float:
    if is_orchestrator:
        in_rate = settings.price_orchestrator_input_per_1k
        out_rate = settings.price_orchestrator_output_per_1k
    else:
        in_rate = settings.price_input_per_1k
        out_rate = settings.price_output_per_1k
    return round((input_tokens / 1000) * in_rate + (output_tokens / 1000) * out_rate, 6)


def usage_from_openai(usage: dict, is_orchestrator: bool = False) -> TokenUsage:
    in_tok = usage.get("prompt_tokens", 0) if usage else 0
    out_tok = usage.get("completion_tokens", 0) if usage else 0
    return TokenUsage(input_tokens=in_tok, output_tokens=out_tok, total_tokens=in_tok + out_tok, cost_usd=compute_cost(in_tok, out_tok, is_orchestrator))


class RunRegistry:
    def __init__(self) -> None:
        self._runs: dict[str, list[TraceEvent]] = {}

    def start(self, run_id: str) -> None:
        self._runs[run_id] = []

    def add(self, run_id: str, event: TraceEvent) -> None:
        self._runs.setdefault(run_id, []).append(event)

    def get(self, run_id: str) -> list[TraceEvent]:
        return self._runs.get(run_id, [])

    def all_run_ids(self) -> list[str]:
        return list(self._runs.keys())


run_registry = RunRegistry()
