import { useState } from "react";
import { useChatRun } from "../../hooks/useChatRun";
import AgentStatusRow from "../../components/readiness/AgentStatusRow";
import ReportCard from "../../components/readiness/ReportCard";
import type { FinalReport } from "../../types";

const SUGGESTIONS = [
  "Are we ready for the E3 production rollout?",
  "What's blocking the Incident Data Management rollout?",
  "Give me a stakeholder update on Incident Data Management readiness.",
];

export default function Chat() {
  const [input, setInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const { events, isRunning, runId, error, start } = useChatRun();

  const runCompleted = events.find((e) => e.event_type === "run_completed");
  const finalReport = runCompleted?.payload as FinalReport | undefined;
  const planEvent = events.find((e) => e.event_type === "plan_ready");

  const handleSubmit = (query: string) => {
    if (!query.trim() || isRunning) return;
    setSubmittedQuery(query);
    start(query, []);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", maxWidth: 780, margin: "0 auto" }}>
      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
        {!submittedQuery && (
          <div style={{ marginTop: 60 }}>
            <h1 style={{ fontFamily: "var(--rd-font-display)", fontSize: 28, margin: 0 }}>
              Ask about launch readiness
            </h1>
            <p style={{ color: "var(--rd-ink-soft)", fontSize: 15, marginTop: 8, lineHeight: 1.5 }}>
              A Coordinator agent breaks your question into specialist tasks — Research, Risk,
              Planning, and Communication — and brings back one clear answer.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSubmit(s)}
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid var(--rd-border)",
                    background: "var(--rd-bg-subtle)",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "var(--rd-ink)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {submittedQuery && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* User message bubble */}
            <div style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
              <div
                style={{
                  background: "var(--rd-accent)",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: "16px 16px 4px 16px",
                  fontSize: 14.5,
                }}
              >
                {submittedQuery}
              </div>
            </div>

            {/* Coordinator reasoning */}
            {planEvent && (
              <div style={{ fontSize: 13, color: "var(--rd-ink-soft)", fontStyle: "italic" }}>
                Coordinator: {planEvent.message}
              </div>
            )}

            {/* Live agent status */}
            <AgentStatusRow events={events} />

            {isRunning && !finalReport && (
              <div style={{ fontSize: 13, color: "var(--rd-ink-faint)" }}>
                Working through {events.length} step{events.length === 1 ? "" : "s"} so far…
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "var(--rd-risk-soft)",
                  color: "var(--rd-risk)",
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            {finalReport && <ReportCard report={finalReport} />}

            {runId && (
              <a
                href={`#/readiness/flow?run=${runId}`}
                style={{ fontSize: 13, color: "var(--rd-accent)", textDecoration: "none", fontWeight: 600 }}
              >
                View system &amp; data flow for this run →
              </a>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: "16px 24px 24px", flexShrink: 0 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(input);
            setInput("");
          }}
          style={{
            display: "flex",
            gap: 8,
            border: "1px solid var(--rd-border-strong)",
            borderRadius: 16,
            padding: 8,
            background: "var(--rd-bg)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a readiness question…"
            disabled={isRunning}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 14.5,
              padding: "8px 10px",
              background: "transparent",
              color: "var(--rd-ink)",
            }}
          />
          <button
            type="submit"
            disabled={isRunning || !input.trim()}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "0 18px",
              background: isRunning ? "var(--rd-border-strong)" : "var(--rd-accent)",
              color: "white",
              fontWeight: 600,
              fontSize: 14,
              cursor: isRunning ? "default" : "pointer",
            }}
          >
            {isRunning ? "Working…" : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );
}
