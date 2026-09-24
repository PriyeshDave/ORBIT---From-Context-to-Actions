import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useSession } from "../../context/SessionContext.jsx";
import ConnectorStrip from "../../components/planner/ConnectorStrip.jsx";
import PlanCards from "../../components/planner/PlanCards.jsx";
import ChatRail from "../../components/planner/ChatRail.jsx";

const TIME_CHIPS = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
];

/** Runs one period's plan-build stream and resolves with its final plan array. */
function runOnePeriod(api, timeOfDay, freeText, sessionToken, onConnectorEvent) {
  return new Promise((resolve, reject) => {
    const es = api.planner.streamPlan(timeOfDay, freeText, sessionToken);
    let finalPlan = null;
    let failed = null;

    es.addEventListener("connector", (e) => {
      const event = JSON.parse(e.data);
      onConnectorEvent(event);
      if (event.status === "error") failed = event.error || `The ${event.tool} connector failed.`;
    });

    es.addEventListener("reasoning", (e) => {
      const event = JSON.parse(e.data);
      if (event.status === "done" && event.output) finalPlan = event.output;
      if (event.status === "error") failed = event.error || "The assistant could not build a plan.";
    });

    es.addEventListener("done", () => {
      es.close();
      if (failed && !finalPlan) reject(new Error(failed));
      else resolve(finalPlan || []);
    });

    es.onerror = () => {
      es.close();
      reject(new Error(`Could not build the ${timeOfDay} plan - is the backend running?`));
    };
  });
}

export default function Planner() {
  const { session } = useSession();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("morning");
  const [freeText, setFreeText] = useState("");
  const [statusByTool, setStatusByTool] = useState({});
  const [plansByPeriod, setPlansByPeriod] = useState({});
  const [running, setRunning] = useState(false);
  const [runningPeriod, setRunningPeriod] = useState(null);
  const [error, setError] = useState(null);
  const [hasRun, setHasRun] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState(null);

  const plan = plansByPeriod[activeTab] || [];

  function handleStatusChange(updatedRun) {
    setPlansByPeriod((prev) => ({ ...prev, [activeTab]: updatedRun.plan }));
  }

  async function handleFeedback(itemTitle, feedback, note) {
    setAdjusting(true);
    setFeedbackNote(null);
    setError(null);
    try {
      const updated = await api.planner.sendFeedback(activeTab, itemTitle, feedback, note, session.sessionToken);
      setPlansByPeriod((prev) => ({ ...prev, [activeTab]: updated.plan }));
      setFeedbackNote(updated.last_feedback);
    } catch (e) {
      setError(e.message || "Could not adjust the plan based on that feedback.");
    } finally {
      setAdjusting(false);
    }
  }

  async function getMyPlan() {
    setRunning(true);
    setError(null);
    setStatusByTool({});
    setPlansByPeriod({});
    setHasRun(true);
    setFeedbackNote(null);

    const results = {};
    for (const { key } of TIME_CHIPS) {
      setRunningPeriod(key);
      setActiveTab(key); // follow along with whichever period is currently building
      try {
        const planForPeriod = await runOnePeriod(api, key, freeText, session.sessionToken, (event) => {
          setStatusByTool((prev) => ({ ...prev, [event.tool]: event.status }));
        });
        results[key] = planForPeriod;
        setPlansByPeriod((prev) => ({ ...prev, [key]: planForPeriod }));
      } catch (e) {
        setError(e.message || `Could not build the ${key} plan.`);
      }
    }
    setActiveTab("morning"); // land back on morning once everything's ready
    setRunningPeriod(null);
    setRunning(false);
  }

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "auto" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "48px 24px 40px" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 6 }}>
              Signed in as <strong style={{ color: "var(--text-secondary)" }}>{session.name}</strong> · {session.role}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 6px" }}>What should I focus on?</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14.5, margin: 0 }}>
              One click builds your morning, afternoon, and evening plan - switch tabs to see each.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {TIME_CHIPS.map((c) => {
              const isBuilding = running && runningPeriod === c.key;
              const isReady = !!plansByPeriod[c.key];
              return (
                <button
                  key={c.key}
                  onClick={() => !running && setActiveTab(c.key)}
                  disabled={running}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 20,
                    border: `1.5px solid ${activeTab === c.key ? "var(--accent-primary)" : "var(--border-default)"}`,
                    background: activeTab === c.key ? "var(--accent-primary-tint)" : "var(--surface-card)",
                    color: activeTab === c.key ? "var(--accent-primary)" : "var(--text-secondary)",
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: running ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {c.label}
                  {isBuilding && <span style={{ fontSize: 11 }}>⏳</span>}
                  {!isBuilding && isReady && <span style={{ fontSize: 11, color: "var(--success)" }}>✓</span>}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Optional: add anything specific to consider…"
              disabled={running}
              style={{
                flex: 1,
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "11px 14px",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              onClick={getMyPlan}
              disabled={running}
              style={{
                background: "var(--accent-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "0 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: running ? "default" : "pointer",
                opacity: running ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {running ? `Building ${runningPeriod}… (${TIME_CHIPS.findIndex((c) => c.key === runningPeriod) + 1}/3)` : hasRun ? "Rebuild my plan" : "Get my plan"}
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <ConnectorStrip statusByTool={statusByTool} connectedTools={session.connectedTools} />
            <button
              onClick={() => navigate("/planner/system-flow")}
              style={{
                border: "1px solid var(--border-default)",
                background: "var(--surface-card)",
                borderRadius: "var(--radius-md)",
                padding: "8px 14px",
                fontSize: 12.5,
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginLeft: 12,
                alignSelf: "flex-start",
              }}
            >
              View system flow
            </button>
          </div>

          {error && (
            <div
              style={{
                background: "var(--danger-tint)",
                color: "var(--danger)",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: 12.5,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {feedbackNote && (
            <div
              style={{
                background: "var(--success-tint)", color: "var(--success)", padding: "8px 12px",
                borderRadius: "var(--radius-md)", fontSize: 12.5, marginBottom: 16,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span>✓</span> {feedbackNote}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <PlanCards plan={plan} timeOfDay={activeTab} onFeedback={hasRun && !running ? handleFeedback : null} onStatusChange={handleStatusChange} adjusting={adjusting} />
          </div>
        </div>
      </div>

      <ChatRail />
    </div>
  );
}
