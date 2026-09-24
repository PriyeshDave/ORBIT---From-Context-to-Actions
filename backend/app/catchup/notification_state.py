"""
Per-persona read/acknowledged state for the org-wide Inbox Digest.

The notifications themselves (org_notifications.json) are the same for
every colleague, but whether a given colleague has read one is personal -
Priyesh acknowledging a notice shouldn't mark it read for Isha. Each
notification's `read` field in the JSON is just its INITIAL state; an
acknowledgment here overrides that, per persona, in memory (demo-scoped,
like the rest of this app's state).
"""
from typing import Optional

_acknowledged_by_persona: dict[str, set[str]] = {}


def is_acknowledged(persona_id: str, notification_id: str) -> bool:
    return notification_id in _acknowledged_by_persona.get(persona_id, set())


def acknowledge(persona_id: str, notification_id: str) -> None:
    _acknowledged_by_persona.setdefault(persona_id, set()).add(notification_id)
