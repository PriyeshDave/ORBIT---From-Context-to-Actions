"""Jira Cloud MCP server. Exposes tickets assigned to the persona, with resolution + overdue status."""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from app.planner.mcp_servers._common import load_fixture, compute_status, is_overdue

server = Server("jira-cloud-mcp-server")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_assigned_tickets",
            description="Returns tickets assigned to the given persona, with status (open/resolved) and overdue flag computed as of the given timestamp.",
            inputSchema={
                "type": "object",
                "properties": {"persona_id": {"type": "string"}, "as_of": {"type": "string", "description": "ISO 8601 timestamp"}},
                "required": ["persona_id", "as_of"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name != "get_assigned_tickets":
        raise ValueError(f"Unknown tool: {name}")

    data = load_fixture("tracker.json")
    persona_id = arguments["persona_id"]
    as_of = arguments["as_of"]
    persona_data = data.get(persona_id, {})

    tickets = []
    for t in persona_data.get("tickets", []):
        status = compute_status(t.get("resolved_at"), as_of)
        overdue = is_overdue(t.get("due_at"), as_of, status)
        tickets.append({**t, "status": status, "is_overdue": overdue})
    return [TextContent(type="text", text=json.dumps({"tickets": tickets}))]


async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
