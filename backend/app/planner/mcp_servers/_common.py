"""
Shared helpers used by all four MCP servers. Kept tiny and dependency-free
since each server is a standalone process.
"""
import json
from datetime import datetime
from pathlib import Path

# mcp_servers -> planner -> app -> data
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


def load_fixture(filename: str) -> dict:
    with open(DATA_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_ts(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def compute_status(resolved_at: str | None, as_of: str) -> str:
    if resolved_at is None:
        return "open"
    return "resolved" if parse_ts(resolved_at) <= parse_ts(as_of) else "open"


def is_overdue(due_at: str | None, as_of: str, status: str) -> bool:
    if status == "resolved" or due_at is None:
        return False
    return parse_ts(due_at) < parse_ts(as_of)
