"""Slack MCP server. Exposes channel messages relevant to the persona as an MCP tool."""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from app.planner.mcp_servers._common import load_fixture, compute_status

server = Server("slack-mcp-server")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_channel_messages",
            description="Returns recent Slack channel messages relevant to the given persona, with acknowledgement status as of the given timestamp.",
            inputSchema={
                "type": "object",
                "properties": {"persona_id": {"type": "string"}, "as_of": {"type": "string", "description": "ISO 8601 timestamp"}},
                "required": ["persona_id", "as_of"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name != "get_channel_messages":
        raise ValueError(f"Unknown tool: {name}")

    data = load_fixture("slack.json")
    persona_id = arguments["persona_id"]
    as_of = arguments["as_of"]
    persona_data = data.get(persona_id, {})

    messages = []
    for m in persona_data.get("channel_messages", []):
        status = compute_status(m.get("acknowledged_at"), as_of)
        messages.append({**m, "status": status})
    return [TextContent(type="text", text=json.dumps({"channel_messages": messages}))]


async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
