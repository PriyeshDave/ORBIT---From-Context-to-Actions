import { TOOLS } from "./toolMeta.js";

export default function DiscoveryPanel({ servers }) {
  if (!servers) {
    return <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Loading MCP discovery…</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
      {servers.map((s) => {
        const meta = TOOLS.find((t) => t.key === s.tool);
        return (
          <div
            key={s.tool}
            style={{
              border: `1px solid ${s.connected ? "var(--border-default)" : "var(--border-default)"}`,
              borderRadius: "var(--radius-md)",
              padding: "12px 14px",
              background: s.connected ? "var(--surface-card)" : "var(--surface-sunken)",
              opacity: s.connected ? 1 : 0.7,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.connected ? meta?.color : "var(--border-strong)" }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{meta?.label || s.tool}</span>
              <span style={{ fontSize: 10.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{s.server_name}</span>
            </div>
            {!s.connected ? (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Not connected - server not queried.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {s.tools.map((t) => (
                  <div key={t.name} style={{ fontSize: 11.5 }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-primary)" }}>{t.name}</span>
                    <div style={{ color: "var(--text-secondary)", marginTop: 1 }}>{t.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
