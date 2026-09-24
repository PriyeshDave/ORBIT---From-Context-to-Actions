import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useSession } from "../../context/SessionContext.jsx";
import PipelineGraph from "../../components/catchup/PipelineGraph.jsx";
import SecurityPanel from "../../components/catchup/SecurityPanel.jsx";
import LLMCallTable from "../../components/catchup/LLMCallTable.jsx";
import RunSummaryFooter from "../../components/catchup/RunSummaryFooter.jsx";

export default function SystemFlow() {
  const { meetingId } = useParams();
  const { session } = useSession();
  const navigate = useNavigate();

  const [events, setEvents] = useState({}); // { [step]: {status, telemetry, security} }
  const [security, setSecurity] = useState(null);
  const [summary, setSummary] = useState(null);
  const [running, setRunning] = useState(false);
  const esRef = useRef(null);

  // On mount, try to load the last completed run so the page isn't empty.
  useEffect(() => {
    api
      .getRunLog(meetingId, session.sessionToken)
      .then((log) => hydrateFromRunLog(log))
      .catch(() => {
        /* no prior run yet - that's fine, user can click "Run live" */
      });
    return () => esRef.current?.close();
  }, [meetingId]);

  function hydrateFromRunLog(log) {
    setSecurity(log.security);
    const map = {};
    for (const step of log.steps) {
      map[step.step] = { status: step.status, telemetry: step.telemetry };
    }
    setEvents(map);
    setSummary(log.summary);
  }

  function runLive() {
    setRunning(true);
    setEvents({});
    setSecurity(null);
    setSummary(null);

    const es = api.catchup.streamPipeline(meetingId, session.sessionToken);
    esRef.current = es;

    es.addEventListener("step", (e) => {
      const event = JSON.parse(e.data);
      if (event.step === "security_check") setSecurity(event.security);
      setEvents((prev) => ({ ...prev, [event.step]: { status: event.status, telemetry: event.telemetry } }));
    });

    es.addEventListener("done", () => {
      setRunning(false);
      es.close();
      // Pull the persisted run log for the finalized summary object.
      api.catchup.getRunLog(meetingId, session.sessionToken).then(hydrateFromRunLog).catch(() => {});
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
            Live view of the orchestration pipeline: access control, each model call, latency, tokens, and cost.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => navigate(`/catchup/meeting/${meetingId}`)}
            style={{
              border: "1px solid var(--border-default)",
              background: "var(--surface-card)",
              borderRadius: "var(--radius-md)",
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Back to assistant
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

      <Section title="1. Access & security check">
        <SecurityPanel security={security} />
      </Section>

      <Section title="2. Data flow — reasoning pipeline">
        <PipelineGraph events={events} />
      </Section>

      <Section title="3. LLM call ledger">
        <LLMCallTable events={events} />
      </Section>

      <Section title="4. Run summary">
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
