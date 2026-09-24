"""
In-memory store for plan runs - process-local, demo-scoped.

Runs are now keyed by (persona_id, time_of_day): a single "Get My Plan"
click generates all three periods at once, so each period needs its own
stored run rather than one persona having a single "last run" that the
next period's generation would silently overwrite.
"""
from dataclasses import dataclass
from typing import Optional

from app.planner.schemas import ConnectorEvent, PlanRunLogResponse

TimeOfDayKey = str  # "morning" | "afternoon" | "evening"

_runs_by_persona: dict[str, dict[TimeOfDayKey, PlanRunLogResponse]] = {}


@dataclass
class PlanContext:
    """
    Everything needed to re-run just the reasoning step without re-fetching
    from the MCP connectors - lets human-in-the-loop feedback feel
    immediate (no re-spawning subprocess servers) while still being a real
    second reasoning call over the same underlying data.
    """
    persona_id: str
    time_of_day: str
    as_of: str
    connected: set[str]
    tool_data: dict[str, dict]
    connector_events: list[ConnectorEvent]
    total_mcp_latency_ms: int


_contexts_by_persona: dict[str, dict[TimeOfDayKey, PlanContext]] = {}


def save_run(persona_id: str, time_of_day: str, run_log: PlanRunLogResponse) -> None:
    _runs_by_persona.setdefault(persona_id, {})[time_of_day] = run_log


def get_run(persona_id: str, time_of_day: str) -> Optional[PlanRunLogResponse]:
    return _runs_by_persona.get(persona_id, {}).get(time_of_day)


def get_all_runs(persona_id: str) -> dict[TimeOfDayKey, PlanRunLogResponse]:
    """All periods generated so far today for this persona, e.g. {"morning": ..., "afternoon": ...}."""
    return dict(_runs_by_persona.get(persona_id, {}))


def save_context(persona_id: str, time_of_day: str, context: PlanContext) -> None:
    _contexts_by_persona.setdefault(persona_id, {})[time_of_day] = context


def get_context(persona_id: str, time_of_day: str) -> Optional[PlanContext]:
    return _contexts_by_persona.get(persona_id, {}).get(time_of_day)
