import { TOOLS } from "./toolMeta.js";

export default function AuthorizationPanel({ connectedTools }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {TOOLS.map((tool) => {
        const connected = connectedTools.includes(tool.key);
        return (
          <div
            key={tool.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: `1px solid ${connected ? "var(--success)" : "var(--border-default)"}33`,
              background: connected ? "var(--success-tint)" : "var(--surface-sunken)",
              borderRadius: "var(--radius-md)",
              padding: "8px 12px",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? "var(--success)" : "var(--text-tertiary)" }} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{tool.label}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                color: connected ? "var(--success)" : "var(--text-tertiary)",
                marginLeft: 4,
              }}
            >
              {connected ? "Allowed" : "Not connected"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
