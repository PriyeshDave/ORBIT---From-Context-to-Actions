"""
SRE incident dashboard - a persona-specific capability for Site Reliability
Engineers (currently: Nishant), separate from the general Daily Plan since
it's a different job-shape: tracking a running incident queue, its
resolution trend, and self-improvement insights - not a ranked list of
today's priorities.

Ticket "notes" here are demo-mocked - nothing is actually written to
ServiceNow - but the response is a genuine, specific confirmation message
reflecting exactly what was asked for, not a generic toast. Assigning
incidents was deliberately left out: a real SRE would do that directly in
ServiceNow, not through a side dashboard, so recreating it here would be a
feature with no real value.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class SREValidationError(ValueError):
    """Raised for bad input (e.g. an empty note) - maps to HTTP 400, not 404."""
    pass

_sre_cache: Optional[dict] = None

# An incident open this long (and still pending) gets bumped up one
# priority level from its severity-derived base - elapsed time is a real
# signal that something is more urgent than its initial severity suggested.
ESCALATION_HOURS = 4
PRIORITY_ORDER = ["P3", "P2", "P1"]


def _load() -> dict:
    global _sre_cache
    if _sre_cache is None:
        with open(DATA_DIR / "sre_incidents.json", "r", encoding="utf-8") as f:
            _sre_cache = json.load(f)
    return _sre_cache


def has_sre_dashboard(persona_id: str) -> bool:
    return persona_id in _load()


_simulated_now_cache: Optional[datetime] = None


def _simulated_now() -> datetime:
    """
    The rest of this demo is frozen at a simulated "today" (see
    simulated_clock.json) rather than real wall-clock time - elapsed-time
    math for pending incidents must use that same reference, or a pending
    incident "created" on the demo's Aug 3 would show as open for months
    by the time this runs for real.
    """
    global _simulated_now_cache
    if _simulated_now_cache is None:
        with open(DATA_DIR / "simulated_clock.json", "r", encoding="utf-8") as f:
            clock = json.load(f)
        _simulated_now_cache = datetime.fromisoformat(clock["as_of"]["evening"])
    return _simulated_now_cache


def _elapsed_hours(created_at: str, resolved_at: Optional[str]) -> float:
    start = datetime.fromisoformat(created_at)
    end = datetime.fromisoformat(resolved_at) if resolved_at else _simulated_now()
    return (end - start).total_seconds() / 3600


def _effective_priority(base_priority: str, elapsed_hours: float, is_pending: bool) -> str:
    if not is_pending:
        return base_priority
    bumps = int(elapsed_hours // ESCALATION_HOURS)
    idx = min(PRIORITY_ORDER.index(base_priority) + bumps, len(PRIORITY_ORDER) - 1)
    return PRIORITY_ORDER[idx]


def get_dashboard(persona_id: str) -> Optional[dict]:
    data = _load().get(persona_id)
    if not data:
        return None

    incidents = []
    for inc in data["incidents"]:
        is_pending = not inc["resolved_at"]
        elapsed = round(_elapsed_hours(inc["created_at"], inc["resolved_at"]), 1)
        incidents.append({
            **inc,
            "elapsed_hours": elapsed,
            "effective_priority": _effective_priority(inc["priority"], elapsed, is_pending),
        })

    resolved = [i for i in incidents if i["resolved_at"]]
    pending = [i for i in incidents if not i["resolved_at"]]
    pre_enriched = [i for i in incidents if i.get("pre_enriched")]

    daily_stats = data["daily_stats"]
    first_avg = next((d["avg_resolution_hours"] for d in daily_stats if d["avg_resolution_hours"] is not None), None)
    last_avg = next((d["avg_resolution_hours"] for d in reversed(daily_stats) if d["avg_resolution_hours"] is not None), None)
    improvement_pct = None
    if first_avg and last_avg and first_avg > 0:
        improvement_pct = round((1 - (last_avg / first_avg)) * 100)

    category_performance = _compute_category_performance(incidents, data.get("category_benchmark_hours", {}))
    self_assessment = _build_self_assessment(category_performance)

    return {
        "persona_id": persona_id,
        "incidents": incidents,
        "daily_stats": daily_stats,
        "summary": {
            "total_incidents": len(incidents),
            "resolved_count": len(resolved),
            "pending_count": len(pending),
            "pre_enriched_count": len(pre_enriched),
            "pre_enriched_pct": round((len(pre_enriched) / len(incidents)) * 100) if incidents else 0,
            "first_period_avg_resolution_hours": first_avg,
            "latest_avg_resolution_hours": last_avg,
            "resolution_time_improvement_pct": improvement_pct,
        },
        "category_performance": category_performance,
        "team_benchmark": data.get("team_benchmark"),
        "self_assessment": self_assessment,
    }


def _compute_category_performance(incidents: list[dict], benchmark_hours: dict[str, float]) -> list[dict]:
    by_cat: dict[str, list[dict]] = {}
    for inc in incidents:
        if inc["resolved_at"]:
            hours = _elapsed_hours(inc["created_at"], inc["resolved_at"])
            by_cat.setdefault(inc["category"], []).append({"id": inc["id"], "hours": hours})

    result = []
    for cat, entries in by_cat.items():
        entries.sort(key=lambda e: e["hours"])  # fastest first
        hours_list = [e["hours"] for e in entries]
        avg = sum(hours_list) / len(hours_list)
        peer_avg = benchmark_hours.get(cat)
        faster_pct = round((1 - (avg / peer_avg)) * 100) if peer_avg else None
        result.append({
            "category": cat,
            "count": len(hours_list),
            "avg_resolution_hours": round(avg, 1),
            "peer_avg_resolution_hours": peer_avg,
            "faster_than_peers_pct": faster_pct,
            "incident_ids_fastest_first": [e["id"] for e in entries],
        })
    result.sort(key=lambda r: (r["faster_than_peers_pct"] is None, -(r["faster_than_peers_pct"] or 0)))
    return result


def _build_self_assessment(category_performance: list[dict]) -> dict:
    with_signal = [c for c in category_performance if c["faster_than_peers_pct"] is not None and c["count"] >= 2]
    if not with_signal:
        return {"strengths": [], "growth_areas": [], "recommendation": None}

    strengths = [c for c in with_signal if c["faster_than_peers_pct"] > 0]
    growth_areas = [c for c in with_signal if c["faster_than_peers_pct"] <= 0]
    strengths.sort(key=lambda c: -c["faster_than_peers_pct"])
    growth_areas.sort(key=lambda c: c["faster_than_peers_pct"])

    # For a strength, the fastest-resolved incidents ARE the good examples.
    # For a growth area, the SLOWEST-resolved ones are what's actually worth
    # revisiting in a retrospective - not the category's best case.
    def with_examples(cats: list[dict], pick_slowest: bool) -> list[dict]:
        out = []
        for c in cats:
            ids = c["incident_ids_fastest_first"]
            example_ids = list(reversed(ids[-2:])) if pick_slowest else ids[:2]
            out.append({**c, "example_incident_ids": example_ids})
        return out

    strengths = with_examples(strengths, pick_slowest=False)
    growth_areas = with_examples(growth_areas, pick_slowest=True)

    recommendation = None
    if growth_areas:
        slowest = growth_areas[0]
        fastest = strengths[0] if strengths else None
        if fastest:
            recommendation = (
                f"{slowest['category']} incidents take you {abs(slowest['faster_than_peers_pct'])}% longer than "
                f"peers, often when they involve a downstream data or pipeline dependency. You resolve "
                f"{fastest['category']} incidents {fastest['faster_than_peers_pct']}% faster than peers - "
                f"worth applying the same triage approach (checking the enrichment pipeline's own telemetry "
                f"first) to {slowest['category']} cases before digging into the underlying system."
            )
        else:
            recommendation = (
                f"{slowest['category']} incidents are currently your slowest category - "
                f"worth a closer look at what's adding time there."
            )

    return {
        "strengths": strengths[:2],
        "growth_areas": growth_areas[:2],
        "recommendation": recommendation,
    }


def apply_action(persona_id: str, incident_id: str, note: Optional[str]) -> str:
    """
    Mock incident note - nothing is actually written anywhere, but the
    confirmation message is specific to what was actually requested.
    """
    if not note or not note.strip():
        raise SREValidationError("A note is required.")
    data = _load().get(persona_id)
    if not data:
        raise ValueError(f"No SRE dashboard is configured for this persona.")
    incident = next((i for i in data["incidents"] if i["id"] == incident_id), None)
    if not incident:
        raise ValueError(f"Incident {incident_id} not found.")
    return f'Note added to {incident_id}: "{note}"'
