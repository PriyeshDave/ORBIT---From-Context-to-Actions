"""
Catch Up capability routes, mounted under /api/catchup by main.py.
Thin routes - real logic lives in app.shared.auth (eligibility) and
app.catchup.brain (the reasoning pipeline).
"""
import json
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.shared import auth as mock_auth
from app.shared.telemetry import build_telemetry
from app.shared.openai_client import call_llm
from app.catchup import brain
from app.catchup import state as run_state
from app.catchup import notification_state
from app.catchup.schemas import (
    ChatRequest, ChatResponse, MeetingSearchResponse, MeetingSearchResult,
    RunLogResponse, SendFollowupRequest, SendFollowupResponse, TranscriptResponse,
)

router = APIRouter(prefix="/api/catchup", tags=["catchup"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


def _persona_from_header(x_session_token: str | None) -> str:
    if not x_session_token:
        raise HTTPException(status_code=401, detail="Missing session token. Please log in.")
    persona_id = mock_auth.resolve_session(x_session_token)
    if not persona_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")
    return persona_id


CRITICAL_PRIORITY_ORDER = {"Critical": 0, "Action Required": 1, "Info": 2}
TRAINING_PRIORITY_ORDER = {"Recommended": 0, "Optional": 1}


@router.get("/notifications")
def get_notifications(x_session_token: str | None = Header(default=None)):
    """
    Org-wide notices and training/event mail - the same for every colleague,
    not persona-specific. Surfaced here because these are exactly the kind
    of important-but-easy-to-miss mail that gets buried in a busy inbox.
    Critical notices sort before Action Required before Info; training
    items sort Recommended before Optional. Each item's `read` field
    reflects THIS persona's own acknowledgment state, not a shared one.
    """
    persona_id = _persona_from_header(x_session_token)
    with open(DATA_DIR / "org_notifications.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    for n in data["critical_notices"]:
        if notification_state.is_acknowledged(persona_id, n["id"]):
            n["read"] = True
    for n in data["training_events"]:
        if notification_state.is_acknowledged(persona_id, n["id"]):
            n["read"] = True

    data["critical_notices"].sort(key=lambda n: CRITICAL_PRIORITY_ORDER.get(n["priority"], 99))
    data["training_events"].sort(key=lambda n: TRAINING_PRIORITY_ORDER.get(n["priority"], 99))
    return data


@router.post("/notifications/{notification_id}/acknowledge")
def acknowledge_notification(notification_id: str, x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    notification_state.acknowledge(persona_id, notification_id)
    return {"acknowledged": True, "notification_id": notification_id}


@router.get("/meetings/search", response_model=MeetingSearchResponse)
def search_meetings(query: str = "", x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    matches = mock_auth.search_meetings(query, persona_id)
    results = []
    for m in matches:
        organizer = mock_auth.get_persona(m["organizer"])
        results.append(MeetingSearchResult(
            id=m["id"], title=m["title"],
            organizer_name=organizer["name"] if organizer else m["organizer"],
            date=m["date"], start_time=m["start_time"], end_time=m["end_time"],
            platform=m["platform"], sensitivity_label=m["sensitivity_label"],
        ))
    return MeetingSearchResponse(query=query, results=results, result_count=len(results))


@router.get("/meetings/{meeting_id}", response_model=MeetingSearchResult)
def get_meeting_detail(meeting_id: str, x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    security = mock_auth.check_eligibility(persona_id, meeting_id)
    if security.decision != "ALLOWED":
        raise HTTPException(status_code=404, detail="No meeting found matching that request.")
    meeting = mock_auth.get_meeting(meeting_id)
    organizer = mock_auth.get_persona(meeting["organizer"])
    return MeetingSearchResult(
        id=meeting["id"], title=meeting["title"],
        organizer_name=organizer["name"] if organizer else meeting["organizer"],
        date=meeting["date"], start_time=meeting["start_time"], end_time=meeting["end_time"],
        platform=meeting["platform"], sensitivity_label=meeting["sensitivity_label"],
    )


@router.get("/meetings/{meeting_id}/transcript", response_model=TranscriptResponse)
def get_transcript(meeting_id: str, x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    security = mock_auth.check_eligibility(persona_id, meeting_id)
    if security.decision != "ALLOWED":
        raise HTTPException(status_code=404, detail="No meeting found matching that request.")
    with open(DATA_DIR / "transcripts.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    t = data.get(meeting_id)
    if not t:
        raise HTTPException(status_code=404, detail="Transcript not found.")
    return TranscriptResponse(meeting_id=meeting_id, source=t["source"], segments=t["segments"])


@router.get("/meetings/{meeting_id}/run-pipeline-stream")
async def run_pipeline_stream(meeting_id: str, x_session_token: str | None = None):
    persona_id = _persona_from_header(x_session_token)

    async def event_generator():
        async for event in brain.run_pipeline(meeting_id, persona_id):
            yield {"event": "step", "data": event.model_dump_json()}
        yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_generator())


@router.get("/meetings/{meeting_id}/run-log", response_model=RunLogResponse)
def get_run_log(meeting_id: str, x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    security = mock_auth.check_eligibility(persona_id, meeting_id)
    if security.decision != "ALLOWED":
        raise HTTPException(status_code=404, detail="No meeting found matching that request.")
    last_run = run_state.get_last_run(meeting_id)
    if not last_run:
        raise HTTPException(status_code=404, detail="No pipeline run has been executed for this meeting yet.")
    return last_run


@router.post("/meetings/{meeting_id}/chat", response_model=ChatResponse)
def chat(meeting_id: str, req: ChatRequest, x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    security = mock_auth.check_eligibility(persona_id, meeting_id)
    if security.decision != "ALLOWED":
        raise HTTPException(status_code=404, detail="No meeting found matching that request.")

    last_run = run_state.get_last_run(meeting_id)
    if last_run:
        context_parts = []
        for step in last_run.steps:
            if step.output is not None:
                context_parts.append(f"[{step.step}]\n{json.dumps(step.output) if not isinstance(step.output, str) else step.output}")
        context = "\n\n".join(context_parts)
    else:
        with open(DATA_DIR / "transcripts.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        t = data.get(meeting_id, {"segments": []})
        context = "\n".join(f"[{s['time']}] {s['speaker']}: {s['text']}" for s in t["segments"])

    with open(PROMPTS_DIR / "chat_qa.txt", "r", encoding="utf-8") as f:
        template = f.read()
    prompt = template.format(context=context, question=req.message)

    result = call_llm(system_prompt="You are a precise, factual assistant. Answer only from the given context.", user_prompt=prompt)
    telem = build_telemetry("chat_qa", result)
    return ChatResponse(reply=result.text, telemetry=telem)


@router.post("/meetings/{meeting_id}/followup/send", response_model=SendFollowupResponse)
def send_followup(meeting_id: str, req: SendFollowupRequest, x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    security = mock_auth.check_eligibility(persona_id, meeting_id)
    if security.decision != "ALLOWED":
        raise HTTPException(status_code=404, detail="No meeting found matching that request.")
    meeting = mock_auth.get_meeting(meeting_id)
    recipients = []
    for pid in meeting["eligible_attendees"]:
        p = mock_auth.get_persona(pid)
        if p:
            recipients.append(p["email"])
    return SendFollowupResponse(status="sent (simulated)", sent_to=recipients)
