"""
Unified mock authentication + eligibility (ACL) layer, shared by all three
capabilities (Catch Up, Planner, Readiness). This replaces what were three
separate mock_auth.py files with one session store and one persona source
of truth (personas.json), so a single login works across the whole product.

Design choices preserved from the original Catch Up demo:
- An ineligible search returns an EMPTY result, not "access denied" - this
  mirrors real enterprise search behavior (never confirm a restricted
  meeting exists).
- Eligibility is re-checked server-side on every content-bearing call,
  never trusted from a prior search result or the frontend's own state.
"""
import json
import secrets
from pathlib import Path
from typing import Optional

from app.shared.schemas import SecurityCheckResult

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

_personas_cache: Optional[dict] = None
_meetings_cache: Optional[dict] = None

# In-memory session store, shared across all capabilities - one login,
# one token, used for Catch Up, Planner, and Readiness alike.
_sessions: dict[str, str] = {}  # session_token -> persona_id


def _load_personas() -> dict:
    global _personas_cache
    if _personas_cache is None:
        with open(DATA_DIR / "personas.json", "r", encoding="utf-8") as f:
            _personas_cache = json.load(f)
    return _personas_cache


def _load_meetings() -> dict:
    global _meetings_cache
    if _meetings_cache is None:
        with open(DATA_DIR / "meetings.json", "r", encoding="utf-8") as f:
            _meetings_cache = json.load(f)
    return _meetings_cache


def get_persona(persona_id: str) -> Optional[dict]:
    for p in _load_personas()["personas"]:
        if p["id"] == persona_id:
            return p
    return None


def verify_password(persona_id: str, password: str) -> bool:
    """
    Mock password check for the demo login flow. Every persona has a
    `password` field in personas.json (plaintext - this is explicitly a
    local demo with fictional data, not a real auth system). Returns False
    for an unknown persona rather than raising, so callers can give a
    generic "invalid credentials" response either way.
    """
    persona = get_persona(persona_id)
    if not persona:
        return False
    return persona.get("password") == password


def list_personas() -> list[dict]:
    return _load_personas()["personas"]


def create_session(persona_id: str) -> str:
    token = secrets.token_urlsafe(24)
    _sessions[token] = persona_id
    return token


def resolve_session(session_token: str) -> Optional[str]:
    """Returns persona_id for a valid session token, else None."""
    return _sessions.get(session_token)


# ---------- Catch Up capability: meeting eligibility ----------

def get_meeting(meeting_id: str) -> Optional[dict]:
    for m in _load_meetings()["meetings"]:
        if m["id"] == meeting_id:
            return m
    return None


def list_meetings() -> list[dict]:
    return _load_meetings()["meetings"]


def search_meetings(query: str, persona_id: str) -> list[dict]:
    query_lower = (query or "").lower().strip()
    results = []
    for m in list_meetings():
        haystack = " ".join([m["title"].lower(), *[k.lower() for k in m["keywords"]]])
        matches_query = (not query_lower) or (query_lower in haystack) or any(
            token in haystack for token in query_lower.split()
        )
        if matches_query and persona_id in m["eligible_attendees"]:
            results.append(m)
    return results


def check_eligibility(persona_id: str, meeting_id: str) -> SecurityCheckResult:
    persona = get_persona(persona_id)
    meeting = get_meeting(meeting_id)
    persona_name = persona["name"] if persona else persona_id

    if not persona:
        return SecurityCheckResult(
            persona_id=persona_id, persona_name=persona_id, meeting_id=meeting_id,
            decision="DENIED", reason="Unknown persona / session not recognized.",
        )
    if not meeting:
        return SecurityCheckResult(
            persona_id=persona_id, persona_name=persona_name, meeting_id=meeting_id,
            decision="DENIED", reason="Meeting not found.",
        )
    if persona_id in meeting["eligible_attendees"]:
        return SecurityCheckResult(
            persona_id=persona_id, persona_name=persona_name, meeting_id=meeting_id,
            decision="ALLOWED", reason=f"{persona_name} is on the attendee list for this meeting.",
            sensitivity_label=meeting.get("sensitivity_label"),
        )
    return SecurityCheckResult(
        persona_id=persona_id, persona_name=persona_name, meeting_id=meeting_id,
        decision="DENIED",
        reason=(
            f"{persona_name} is not on the attendee list and has no sharing "
            f"permission for this '{meeting.get('sensitivity_label', 'Confidential')}' labeled meeting."
        ),
        sensitivity_label=meeting.get("sensitivity_label"),
    )


# ---------- Planner capability: per-connector authorization ----------

def connected_tools(persona_id: str) -> list[str]:
    persona = get_persona(persona_id)
    return persona.get("connected_tools", []) if persona else []


def is_tool_connected(persona_id: str, tool: str) -> bool:
    return tool in connected_tools(persona_id)
