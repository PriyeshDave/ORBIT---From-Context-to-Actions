"""
MCP client manager - the piece that actually speaks the MCP protocol: for
each connected tool, spawns that tool's MCP server as a stdio subprocess,
opens a real `mcp.ClientSession`, runs the standard MCP handshake, and
calls tools on it.

Design choice preserved from the original: a fresh subprocess + session is
opened per request per connector, rather than a long-lived pool - trades a
small amount of per-call startup latency for simple lifecycle management.
The latency shown in the System Flow page is the real, honest cost of
this choice.
"""
import sys
import time
from pathlib import Path
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from app.planner.schemas import DiscoveredTool, MCPServerDiscovery, ToolKey

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent  # .../backend
SERVERS_DIR = BACKEND_ROOT / "app" / "planner" / "mcp_servers"

SERVER_SCRIPTS: dict[str, Path] = {
    "outlook": SERVERS_DIR / "outlook_server.py",
    "teams": SERVERS_DIR / "teams_server.py",
    "slack": SERVERS_DIR / "slack_server.py",
    "tracker": SERVERS_DIR / "tracker_server.py",
}

SERVER_DISPLAY_NAMES: dict[str, str] = {
    "outlook": "outlook-mcp-server",
    "teams": "teams-mcp-server",
    "slack": "slack-mcp-server",
    "tracker": "jira-cloud-mcp-server",
}

TOOL_CALL_PLAN: dict[str, list[tuple[str, list[str]]]] = {
    "outlook": [("get_calendar_events", ["persona_id"]), ("get_flagged_emails", ["persona_id", "as_of"])],
    "teams": [("get_mentions", ["persona_id", "as_of"]), ("get_direct_messages", ["persona_id", "as_of"])],
    "slack": [("get_channel_messages", ["persona_id", "as_of"])],
    "tracker": [("get_assigned_tickets", ["persona_id", "as_of"])],
}


def _server_params(tool: str) -> StdioServerParameters:
    return StdioServerParameters(command=sys.executable, args=[str(SERVER_SCRIPTS[tool])])


async def discover_server(tool: ToolKey, connected: bool) -> MCPServerDiscovery:
    if not connected:
        return MCPServerDiscovery(tool=tool, connected=False, server_name=SERVER_DISPLAY_NAMES[tool], tools=[])

    params = _server_params(tool)
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.list_tools()
            tools = [
                DiscoveredTool(name=t.name, description=t.description or "", input_schema=t.inputSchema or {})
                for t in result.tools
            ]
            return MCPServerDiscovery(tool=tool, connected=True, server_name=SERVER_DISPLAY_NAMES[tool], tools=tools)


async def query_connector(tool: ToolKey, persona_id: str, as_of: str) -> tuple[dict[str, Any], int, str]:
    params = _server_params(tool)
    tool_names_called = []
    aggregated: dict[str, Any] = {}

    start = time.perf_counter()
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            for tool_name, arg_keys in TOOL_CALL_PLAN[tool]:
                args = {"persona_id": persona_id, "as_of": as_of} if "as_of" in arg_keys else {"persona_id": persona_id}
                result = await session.call_tool(tool_name, args)
                tool_names_called.append(tool_name)
                payload = result.content[0].text if result.content else "{}"
                import json as _json
                aggregated.update(_json.loads(payload))
    latency_ms = int((time.perf_counter() - start) * 1000)

    return aggregated, latency_ms, ", ".join(tool_names_called)
