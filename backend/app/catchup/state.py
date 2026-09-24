"""
In-memory store for the last pipeline run per meeting - process-local,
demo-scoped, clears on restart. Lets the System Flow page fetch a
completed run's telemetry without re-running the pipeline.
"""
from typing import Optional

from app.catchup.schemas import RunLogResponse

_last_run_by_meeting: dict[str, RunLogResponse] = {}


def save_run(meeting_id: str, run_log: RunLogResponse) -> None:
    _last_run_by_meeting[meeting_id] = run_log


def get_last_run(meeting_id: str) -> Optional[RunLogResponse]:
    return _last_run_by_meeting.get(meeting_id)
