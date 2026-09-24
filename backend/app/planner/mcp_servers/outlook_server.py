"""
Outlook MCP server. Exposes calendar + flagged-email data as MCP tools.
Stands in for what would, in production, be a Microsoft Graph-backed MCP
server - the tool names/shapes here are deliberately realistic so the
swap-in later is a data source change, not a redesign.
"""
import asyncio
import json
import sys
from pathlib import Path

# mcp_servers -> planner -> app -> backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from app.planner.mcp_servers._common import load_fixture, compute_status, is_overdue

server = Server("outlook-mcp-server")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_calendar_events",
            description="Returns today's calendar events for the given persona.",
            inputSchema={"type": "object", "properties": {"persona_id": {"type": "string"}}, "required": ["persona_id"]},
        ),
        Tool(
            name="get_flagged_emails",
            description="Returns flagged/important inbox emails for the given persona, with resolution status computed as of the given timestamp.",
            inputSchema={
                "type": "object",
                "properties": {"persona_id": {"type": "string"}, "as_of": {"type": "string", "description": "ISO 8601 timestamp"}},
                "required": ["persona_id", "as_of"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    data = load_fixture("outlook.json")
    persona_id = arguments["persona_id"]
    persona_data = data.get(persona_id, {})

    if name == "get_calendar_events":
        events = persona_data.get("calendar_events", [])
        return [TextContent(type="text", text=json.dumps({"calendar_events": events}))]

    if name == "get_flagged_emails":
        as_of = arguments["as_of"]
        emails = []
        for e in persona_data.get("flagged_emails", []):
            status = compute_status(e.get("resolved_at"), as_of)
            emails.append({**e, "status": status})
        return [TextContent(type="text", text=json.dumps({"flagged_emails": emails}))]

    raise ValueError(f"Unknown tool: {name}")


async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
