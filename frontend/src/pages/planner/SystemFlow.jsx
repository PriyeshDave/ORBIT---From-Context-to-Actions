import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useSession } from "../../context/SessionContext.jsx";
import DiscoveryPanel from "../../components/planner/DiscoveryPanel.jsx";
import FanOutGraph from "../../components/planner/FanOutGraph.jsx";
import ReasoningPanel from "../../components/planner/ReasoningPanel.jsx";
import AuthorizationPanel from "../../components/planner/AuthorizationPanel.jsx";
import RunSummaryFooter from "../../components/planner/RunSummaryFooter.jsx";

const TIME_CHIPS = ["morning", "afternoon", "evening"];

export default function SystemFlow() {
  const { session } = useSession();
  const navigate = useNavigate();

  const [servers, setServers] = useState(null);
  const [events, setEvents] = useState({}); // { [tool]: {status, telemetry} }
  const [reasoning, setReasoning] = useState(null);
  const [summary, setSummary] = useState(null);
  const [running, setRunning] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState("morning");
  const esRef = useRef(null);

  useEffect(() => {
    api.planner.mcpDiscovery(session.sessionToken).then((res) => setServers(res.servers)).catch(() => {});
    api.planner
      .getRunLog(timeOfDay, session.sessionToken)
      .then(hydrateFromRunLog)
      .catch(() => {});
    return () => esRef.current?.close();
  }, []);

  function hydrateFromRunLog(log) {
    const map = {};
    for (const c of log.connectors) {
      map[c.tool] = { status: c.status, telemetry: c.telemetry };
    }
    setEvents(map);
    setReasoning(log.reasoning);
    setSummary(log.summary);
    setTimeOfDay(log.time_of_day);
  }

  function runLive() {
    setRunning(true);
    setEvents({});
    setReasoning(null);
    setSummary(null);

    const es = api.planner.streamPlan(timeOfDay, null, session.sessionToken);
    esRef.current = es;

    es.addEventListener("connector", (e) => {
      const event = JSON.parse(e.data);
      setEvents((prev) => ({ ...prev, [event.tool]: { status: event.status, telemetry: event.telemetry } }));
    });

    es.addEventListener("reasoning", (e) => {
      const event = JSON.parse(e.data);
      setReasoning(event);
    });

    es.addEventListener("done", () => {
      setRunning(false);
      es.close();
      api.planner.getRunLog(timeOfDay, session.sessionToken).then(hydrateFromRunLog).catch(() => {});
    });

    es.onerror = () => {
      setRunning(false);
      es.close();
    };
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>System Flow</div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
            Live view of the MCP fan-out: real tool discovery, parallel connector calls, and the reasoning call that synthesizes them.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
            style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "8px 10px", fontSize: 13 }}
          >
            {TIME_CHIPS.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <button
            onClick={() => navigate("/planner")}
            style={{ border: "1px solid var(--border-default)", background: "var(--surface-card)", borderRadius: "var(--radius-md)", padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
          >
            Back to planner
          </button>
          <button
            onClick={runLive}
            disabled={running}
            style={{
              background: "var(--accent-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: running ? "default" : "pointer",
              opacity: running ? 0.7 : 1,
            }}
          >
            {running ? "Running live…" : "Run live"}
          </button>
        </div>
      </div>

      <Section title="1. Per-connector authorization">
        <AuthorizationPanel connectedTools={session.connectedTools} />
      </Section>

      <Section title="2. MCP tool discovery (real list_tools() results)">
        <DiscoveryPanel servers={servers} />
      </Section>

      <Section title="3. Connector fan-out (parallel MCP calls)">
        <FanOutGraph events={events} connectedTools={session.connectedTools} />
      </Section>

      <Section title="4. Reasoning call (single synthesis LLM call)">
        <ReasoningPanel reasoning={reasoning} />
      </Section>

      <Section title="5. Run summary">
        <RunSummaryFooter summary={summary} />
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
