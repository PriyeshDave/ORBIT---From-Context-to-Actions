"""Teams MCP server. Exposes channel mentions + direct messages as MCP tools."""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from app.planner.mcp_servers._common import load_fixture, compute_status

server = Server("teams-mcp-server")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_mentions",
            description="Returns channel @mentions of the given persona, with acknowledgement status as of the given timestamp.",
            inputSchema={
                "type": "object",
                "properties": {"persona_id": {"type": "string"}, "as_of": {"type": "string", "description": "ISO 8601 timestamp"}},
                "required": ["persona_id", "as_of"],
            },
        ),
        Tool(
            name="get_direct_messages",
            description="Returns direct messages sent to the given persona, with acknowledgement status as of the given timestamp.",
            inputSchema={
                "type": "object",
                "properties": {"persona_id": {"type": "string"}, "as_of": {"type": "string", "description": "ISO 8601 timestamp"}},
                "required": ["persona_id", "as_of"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    data = load_fixture("teams.json")
    persona_id = arguments["persona_id"]
    as_of = arguments["as_of"]
    persona_data = data.get(persona_id, {})

    if name == "get_mentions":
        mentions = []
        for m in persona_data.get("mentions", []):
            status = compute_status(m.get("acknowledged_at"), as_of)
            mentions.append({**m, "status": status})
        return [TextContent(type="text", text=json.dumps({"mentions": mentions}))]

    if name == "get_direct_messages":
        dms = []
        for d in persona_data.get("direct_messages", []):
            status = compute_status(d.get("acknowledged_at"), as_of)
            dms.append({**d, "status": status})
        return [TextContent(type="text", text=json.dumps({"direct_messages": dms}))]

    raise ValueError(f"Unknown tool: {name}")


async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
