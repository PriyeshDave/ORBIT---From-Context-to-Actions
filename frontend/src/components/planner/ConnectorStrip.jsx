import { TOOLS } from "./toolMeta.js";

/**
 * statusByTool: { [toolKey]: "pending" | "running" | "done" | "error" | "skipped" }
 */
export default function ConnectorStrip({ statusByTool, connectedTools }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {TOOLS.map((tool) => {
        const isConnected = connectedTools.includes(tool.key);
        const status = statusByTool[tool.key] || (isConnected ? "pending" : "skipped");
        return (
          <div
            key={tool.key}
            title={isConnected ? tool.label : `${tool.label} - not connected`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: `1.5px solid ${!isConnected ? "var(--border-default)" : status === "pending" ? "var(--border-default)" : tool.color}`,
              background: !isConnected
                ? "var(--surface-sunken)"
                : status === "done"
                ? `${tool.color}14`
                : status === "running"
                ? "var(--surface-subtle)"
                : "var(--surface-card)",
              opacity: isConnected ? 1 : 0.55,
              minWidth: 132,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: isConnected ? tool.color : "var(--border-strong)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {tool.letter}
            </span>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{tool.label}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>
                {!isConnected
                  ? "Not connected"
                  : status === "running"
                  ? "Fetching…"
                  : status === "done"
                  ? "Loaded"
                  : status === "error"
                  ? "Error"
                  : "Waiting"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
