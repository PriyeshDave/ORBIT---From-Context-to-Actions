import { TOOLS } from "./toolMeta.js";

/**
 * events: { [toolKey]: { status, telemetry } }
 */
export default function FanOutGraph({ events, connectedTools }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {TOOLS.map((tool) => {
        const isConnected = connectedTools.includes(tool.key);
        const ev = events[tool.key];
        const status = ev?.status || (isConnected ? "pending" : "skipped");
        const telem = ev?.telemetry;

        return (
          <div
            key={tool.key}
            style={{
              border: `1.5px solid ${!isConnected ? "var(--border-default)" : status === "pending" ? "var(--border-default)" : tool.color}`,
              borderRadius: "var(--radius-md)",
              padding: "14px",
              background: !isConnected
                ? "var(--surface-sunken)"
                : status === "done"
                ? `${tool.color}0f`
                : status === "running"
                ? "var(--surface-subtle)"
                : status === "error"
                ? "var(--danger-tint)"
                : "var(--surface-card)",
              opacity: isConnected ? 1 : 0.6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Dot status={status} color={tool.color} connected={isConnected} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{tool.label}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>
              {!isConnected && "Not connected - skipped"}
              {isConnected && status === "pending" && "Waiting to start…"}
              {isConnected && status === "running" && "MCP call in flight…"}
              {isConnected && status === "done" && "Complete"}
              {isConnected && status === "error" && "Failed"}
            </div>
            {telem && (
              <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{telem.tool_name}</div>
                <div>{telem.latency_ms} ms</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Dot({ status, color, connected }) {
  const base = { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 };
  if (!connected) return <span style={{ ...base, border: "2px solid var(--border-strong)" }} />;
  if (status === "running")
    return (
      <span style={{ ...base, border: `2px solid ${color}`, borderTopColor: "transparent", animation: "spin 800ms linear infinite" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </span>
    );
  if (status === "done") return <span style={{ ...base, background: color }} />;
  if (status === "error") return <span style={{ ...base, background: "var(--danger)" }} />;
  return <span style={{ ...base, border: "2px solid var(--border-strong)" }} />;
}
