import type { TraceEvent } from "../../types";

export default function SecurityPanel({ events }: { events: TraceEvent[] }) {
  const guardrailEvents = events.filter((e) => e.guardrails.length > 0);
  const toolCallEvents = events.filter((e) => e.tool_calls.length > 0);
  const allChecks = guardrailEvents.flatMap((e) => e.guardrails);
  const failedCount = allChecks.filter((g) => !g.passed).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderRadius: 10,
          background: failedCount === 0 ? "var(--rd-planning-soft)" : "var(--rd-risk-soft)",
          color: failedCount === 0 ? "var(--rd-planning)" : "var(--rd-risk)",
          fontWeight: 600,
          fontSize: 13.5,
        }}
      >
        {failedCount === 0
          ? `All ${allChecks.length} guardrail checks passed`
          : `${failedCount} of ${allChecks.length} guardrail checks flagged something`}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {guardrailEvents.map((e, i) =>
          e.guardrails.map((g, j) => (
            <div
              key={`${i}-${j}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--rd-border)",
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>{g.check_name}</span>
                <span style={{ color: "var(--rd-ink-faint)", marginLeft: 8 }}>{g.detail}</span>
              </div>
              <span style={{ color: g.passed ? "var(--rd-planning)" : "var(--rd-risk)", fontWeight: 700 }}>
                {g.passed ? "PASS" : "FLAGGED"}
              </span>
            </div>
          ))
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--rd-ink-soft)", textTransform: "uppercase", marginBottom: 6 }}>
          MCP Tool Calls ({toolCallEvents.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {toolCallEvents.map((e, i) =>
            e.tool_calls.map((tc, j) => (
              <div
                key={`${i}-${j}`}
                style={{
                  fontSize: 12.5,
                  fontFamily: "var(--rd-font-mono)",
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "var(--rd-bg-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {tc.mcp_server}.{tc.tool_name}()
                </span>
                <span style={{ color: "var(--rd-ink-faint)" }}>{tc.latency_ms.toFixed(2)} ms</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
