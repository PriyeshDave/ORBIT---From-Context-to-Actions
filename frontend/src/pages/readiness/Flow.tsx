import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { TraceEvent } from "../../types";
import AgentGraph from "../../components/readiness/AgentGraph";
import MetricsPanel from "../../components/readiness/MetricsPanel";
import SecurityPanel from "../../components/readiness/SecurityPanel";
import EventTimeline from "../../components/readiness/EventTimeline";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type Tab = "graph" | "metrics" | "security" | "timeline";

export default function Flow() {
  const [searchParams] = useSearchParams();
  const [runIds, setRunIds] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(searchParams.get("run"));
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [tab, setTab] = useState<Tab>("graph");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/readiness/flow/runs`)
      .then((r) => r.json())
      .then((data) => {
        setRunIds(data.run_ids ?? []);
        if (!selectedRun && data.run_ids?.length) {
          setSelectedRun(data.run_ids[data.run_ids.length - 1]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRun) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/readiness/flow/runs/${selectedRun}`)
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [selectedRun]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 28px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontFamily: "var(--rd-font-display)", fontSize: 22, margin: 0 }}>System &amp; Data Flow</h1>
          <p style={{ color: "var(--rd-ink-soft)", fontSize: 13.5, margin: "4px 0 0" }}>
            Live agent-to-agent communication, LLM call latency, cost, and security checks for a run.
          </p>
        </div>
        <select
          value={selectedRun ?? ""}
          onChange={(e) => setSelectedRun(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--rd-border-strong)",
            fontSize: 13,
            fontFamily: "var(--rd-font-mono)",
          }}
        >
          {runIds.length === 0 && <option value="">No runs yet — ask a question in Chat</option>}
          {runIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 4, marginTop: 16, flexShrink: 0, borderBottom: "1px solid var(--rd-border)" }}>
        {(["graph", "metrics", "security", "timeline"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--rd-accent)" : "2px solid transparent",
              background: "transparent",
              fontWeight: 600,
              fontSize: 13.5,
              color: tab === t ? "var(--rd-accent-ink)" : "var(--rd-ink-soft)",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {t === "graph" ? "Agent Graph" : t}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto", marginTop: 16 }}>
        {loading && <p style={{ color: "var(--rd-ink-faint)", fontSize: 13 }}>Loading trace…</p>}
        {!loading && events.length === 0 && (
          <p style={{ color: "var(--rd-ink-faint)", fontSize: 13 }}>
            No trace to show yet. Go to the Chat tab and ask a readiness question first.
          </p>
        )}
        {!loading && events.length > 0 && (
          <>
            {tab === "graph" && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
                <AgentGraph events={events} />
              </div>
            )}
            {tab === "metrics" && <MetricsPanel events={events} />}
            {tab === "security" && <SecurityPanel events={events} />}
            {tab === "timeline" && <EventTimeline events={events} />}
          </>
        )}
      </div>
    </div>
  );
}
