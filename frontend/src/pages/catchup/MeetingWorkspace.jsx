import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useSession } from "../../context/SessionContext.jsx";
import ChatRail from "../../components/catchup/ChatRail.jsx";
import {
  OverviewTab,
  DecisionsTab,
  ActionsTab,
  RisksTab,
  PrioritiesTab,
  FollowupTab,
} from "../../components/catchup/OutputTabs.jsx";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "decisions", label: "Decisions Made" },
  { key: "actions", label: "Action Items" },
  { key: "risks", label: "Blockers" },
  { key: "priorities", label: "Priorities" },
  { key: "followup", label: "Draft Follow-up" },
];

export default function MeetingWorkspace() {
  const { meetingId } = useParams();
  const { session } = useSession();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [accessError, setAccessError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [statusByStep, setStatusByStep] = useState({});
  const [outputs, setOutputs] = useState({});
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [hasRun, setHasRun] = useState(false);

  const [draft, setDraft] = useState("");
  const [sendStatus, setSendStatus] = useState(null);

  const esRef = useRef(null);

  useEffect(() => {
    setAccessError(null);
    setMeeting(null);
    setTranscript(null);
    setStatusByStep({});
    setOutputs({});
    setHasRun(false);

    Promise.all([
      api.catchup.getMeeting(meetingId, session.sessionToken),
      api.catchup.getTranscript(meetingId, session.sessionToken),
    ])
      .then(([m, t]) => {
        setMeeting(m);
        setTranscript(t);
      })
      .catch((e) => setAccessError(e.message));

    return () => esRef.current?.close();
  }, [meetingId]);

  useEffect(() => {
    const followup = outputs.draft_followup;
    if (followup && typeof followup !== "string") {
      setDraft(followup.body || "");
    }
  }, [outputs.draft_followup]);

  function runPipeline() {
    setRunning(true);
    setRunError(null);
    setStatusByStep({});
    setOutputs({});
    setHasRun(true);

    const es = api.catchup.streamPipeline(meetingId, session.sessionToken);
    esRef.current = es;

    es.addEventListener("step", (e) => {
      const event = JSON.parse(e.data);
      setStatusByStep((prev) => ({ ...prev, [event.step]: event.status }));
      if (event.status === "done" && event.output !== undefined && event.output !== null) {
        setOutputs((prev) => ({ ...prev, [event.step]: event.output }));
      }
      if (event.status === "error") {
        setRunError(event.error || "The assistant could not access this meeting.");
      }
    });

    es.addEventListener("done", () => {
      setRunning(false);
      es.close();
    });

    es.onerror = () => {
      setRunning(false);
      es.close();
    };
  }

  async function handleSend() {
    setSendStatus(null);
    try {
      const res = await api.catchup.sendFollowup(meetingId, draft, session.sessionToken);
      setSendStatus(`Sent (simulated) to ${res.sent_to.length} attendees.`);
    } catch (e) {
      setSendStatus(`Failed: ${e.message}`);
    }
  }

  if (accessError) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No results found</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
            We couldn't find a meeting matching that request. This may be because the meeting
            doesn't exist, or because it hasn't been shared with you.
          </div>
          <button
            onClick={() => navigate("/catchup")}
            style={{
              border: "1px solid var(--border-default)",
              background: "var(--surface-card)",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Back to search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid var(--border-default)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{meeting?.title || "Loading meeting…"}</div>
              {meeting && (
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
                  {meeting.platform} · {meeting.date} · {meeting.start_time}–{meeting.end_time} · Organized by{" "}
                  {meeting.organizer_name}
                  {"  ·  "}
                  <span style={{ color: "var(--accent-primary)" }}>{meeting.sensitivity_label}</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => navigate(`/catchup/meeting/${meetingId}/system-flow`)}
                style={{
                  border: "1px solid var(--border-default)",
                  background: "var(--surface-card)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 14px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                View system flow
              </button>
              <button
                onClick={runPipeline}
                disabled={running || !transcript}
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
                {running ? "Running…" : hasRun ? "Run again" : "Run catch-up assistant"}
              </button>
            </div>
          </div>

          {runError && (
            <div
              style={{
                marginTop: 10,
                background: "var(--danger-tint)",
                color: "var(--danger)",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: 12.5,
              }}
            >
              {runError}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "10px 24px 0", borderBottom: "1px solid var(--border-default)" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                border: "none",
                background: "none",
                padding: "8px 14px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                color: activeTab === t.key ? "var(--accent-primary)" : "var(--text-secondary)",
                borderBottom: activeTab === t.key ? "2px solid var(--accent-primary)" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {activeTab === "overview" && <OverviewTab outputs={outputs} />}
          {activeTab === "decisions" && <DecisionsTab outputs={outputs} />}
          {activeTab === "actions" && <ActionsTab outputs={outputs} />}
          {activeTab === "risks" && <RisksTab outputs={outputs} />}
          {activeTab === "priorities" && <PrioritiesTab outputs={outputs} />}
          {activeTab === "followup" && (
            <FollowupTab
              outputs={outputs}
              draft={draft}
              setDraft={setDraft}
              onSend={handleSend}
              sendStatus={sendStatus}
            />
          )}
        </div>
      </div>

      <ChatRail meetingId={meetingId} />
    </div>
  );
}
