import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useSession } from "../../context/SessionContext.jsx";

const PRIORITY_COLOR = { P1: "var(--danger)", P2: "var(--urgency-high)", P3: "var(--accent-primary)" };
const PRIORITY_TINT = { P1: "var(--danger-tint)", P2: "#fdeee3", P3: "var(--accent-primary-tint)" };
const CATEGORY_COLOR = {
  "Data/Privacy": "var(--danger)", "Data Integrity": "var(--danger)",
  Governance: "var(--accent-secondary)", Dependency: "#B5651D",
  Delivery: "var(--accent-primary)", Performance: "var(--accent-primary)",
  Operational: "#0F7B6C", Infrastructure: "#0F7B6C",
  Connectivity: "#5B5FC7", "Data Pipeline": "#8764B8",
  Configuration: "#8A6D3B", Availability: "var(--danger)",
};

function fmtHours(h) {
  if (h === null || h === undefined) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function StatCard({ label, value, sub, accent, tooltip }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ flex: 1, position: "relative", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-md)", background: "var(--surface-card)", padding: "16px 18px" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {tooltip && <span style={{ fontSize: 11, color: "var(--text-tertiary)", cursor: "help" }}>ⓘ</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--success)", marginTop: 4, fontWeight: 600 }}>{sub}</div>}
      {tooltip && hover && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 20, width: 260,
          background: "var(--text-primary)", color: "#fff", fontSize: 11.5, lineHeight: 1.5,
          padding: "10px 12px", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

/** Grouped bar chart: created vs resolved per day, with hover tooltip. */
function CreatedResolvedChart({ dailyStats }) {
  const [hovered, setHovered] = useState(null);
  const W = 560, H = 190, padL = 34, padB = 24, padT = 20;
  const maxVal = Math.max(1, ...dailyStats.map((d) => Math.max(d.created, d.resolved)));
  const chartW = W - padL - 10;
  const chartH = H - padT - padB;
  const groupW = chartW / dailyStats.length;
  const barW = groupW * 0.32;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 560, overflow: "visible" }}>
      {[0, 0.5, 1].map((f, i) => (
        <line key={i} x1={padL} x2={W - 10} y1={padT + chartH * (1 - f)} y2={padT + chartH * (1 - f)} stroke="var(--border-default)" strokeWidth="1" />
      ))}
      {dailyStats.map((d, i) => {
        const gx = padL + i * groupW;
        const createdH = (d.created / maxVal) * chartH;
        const resolvedH = (d.resolved / maxVal) * chartH;
        const label = d.date.slice(5).replace("-", "/");
        const isHovered = hovered === i;
        return (
          <g key={d.date} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
            <rect x={gx} y={padT} width={groupW} height={chartH} fill={isHovered ? "var(--accent-primary-tint)" : "transparent"} />
            <rect x={gx + groupW * 0.12} y={padT + chartH - createdH} width={barW} height={createdH} fill="var(--border-strong)" rx="2" />
            <rect x={gx + groupW * 0.52} y={padT + chartH - resolvedH} width={barW} height={resolvedH} fill="var(--success)" rx="2" />
            <text x={gx + groupW / 2} y={H - 6} fontSize="9.5" textAnchor="middle" fill="var(--text-tertiary)">{label}</text>
            {isHovered && (
              <g>
                <rect x={gx + groupW / 2 - 42} y={padT - 4} width="84" height="34" rx="4" fill="var(--text-primary)" />
                <text x={gx + groupW / 2} y={padT + 9} fontSize="9.5" textAnchor="middle" fill="#fff">Created: {d.created}</text>
                <text x={gx + groupW / 2} y={padT + 21} fontSize="9.5" textAnchor="middle" fill="#fff">Resolved: {d.resolved}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Line chart: average resolution time trend, with hover tooltip. Extra top padding fixes label clipping. */
function ResolutionTrendChart({ dailyStats }) {
  const [hovered, setHovered] = useState(null);
  const W = 560, H = 150, padL = 34, padB = 22, padT = 28;
  const points = dailyStats.filter((d) => d.avg_resolution_hours !== null);
  const maxVal = Math.max(1, ...points.map((d) => d.avg_resolution_hours));
  const chartW = W - padL - 10;
  const chartH = H - padT - padB;
  const stepX = chartW / Math.max(points.length - 1, 1);

  const coords = points.map((d, i) => ({
    x: padL + i * stepX,
    y: padT + chartH - (d.avg_resolution_hours / maxVal) * chartH,
    d,
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 560, overflow: "visible" }}>
      <path d={path} fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" />
      {coords.map((c, i) => (
        <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
          <circle cx={c.x} cy={c.y} r="10" fill="transparent" />
          <circle cx={c.x} cy={c.y} r={hovered === i ? 5 : 3.5} fill="var(--accent-primary)" />
          <text x={c.x} y={H - 6} fontSize="9.5" textAnchor="middle" fill="var(--text-tertiary)">{c.d.date.slice(5).replace("-", "/")}</text>
          {hovered === i && (
            <g>
              <rect x={c.x - 34} y={Math.max(c.y - 30, 2)} width="68" height="20" rx="4" fill="var(--text-primary)" />
              <text x={c.x} y={Math.max(c.y - 30, 2) + 14} fontSize="10" textAnchor="middle" fill="#fff" fontWeight="700">{c.d.avg_resolution_hours}h avg</text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 800, color: "#fff", background: PRIORITY_COLOR[priority] || "var(--text-secondary)",
      padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap",
    }}>
      {priority}
    </span>
  );
}

function EnrichmentBlock({ incident }) {
  if (incident.pre_enriched && incident.enrichment) {
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>
          ✨ Enriched by Orbit's ServiceNow IDM Agent
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div style={{ background: "var(--accent-primary-tint)", borderRadius: "var(--radius-md)", padding: "8px 10px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-primary)", marginBottom: 3 }}>PREDICTED CATEGORY</div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{incident.enrichment.predicted_category}</div>
          </div>
          <div style={{ background: "var(--danger-tint)", borderRadius: "var(--radius-md)", padding: "8px 10px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--danger)", marginBottom: 3 }}>PROBABLE ROOT CAUSE</div>
            <div style={{ fontSize: 12, lineHeight: 1.4 }}>{incident.enrichment.probable_root_cause}</div>
          </div>
        </div>
        <div style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", padding: "8px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 3 }}>AI SUMMARY</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{incident.enrichment.summary}</div>
        </div>
        {incident.enrichment.similar_incidents && incident.enrichment.similar_incidents.length > 0 && (
          <div style={{ marginTop: 10, background: "#F1EBFE", borderRadius: "var(--radius-md)", padding: "8px 10px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#5A2D82", marginBottom: 5 }}>🔗 SIMILAR PAST INCIDENTS</div>
            {incident.enrichment.similar_incidents.map((s) => (
              <div key={s.id} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 3 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-secondary)" }}>{s.id}</span> — {s.note}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>
        Raw incident data (not enriched)
      </div>
      <div style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", padding: "8px 10px", fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>
        {incident.incident_description}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6, fontStyle: "italic" }}>
        This incident fell outside what the enrichment pipeline covers - no AI-generated summary or root cause is available, same as what a service engineer would have seen before Orbit.
      </div>
    </div>
  );
}

function IncidentIdBadge({ id }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e) {
    e.stopPropagation(); // don't toggle the row's expand/collapse
    navigator.clipboard?.writeText(id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 5 }}>
      <button
        onClick={handleCopy}
        title="Copy incident ID"
        style={{ border: "none", background: "none", cursor: "pointer", padding: 2, lineHeight: 0, color: "var(--text-tertiary)" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
        </svg>
      </button>
      <span style={{ fontSize: 11, color: "var(--accent-secondary)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{id}</span>
      {copied && (
        <span style={{
          position: "absolute", left: 0, top: "100%", marginTop: 4, zIndex: 10,
          background: "var(--text-primary)", color: "#fff", fontSize: 10.5, fontWeight: 600,
          padding: "3px 8px", borderRadius: "var(--radius-sm)", whiteSpace: "nowrap",
        }}>
          ✓ Incident copied
        </span>
      )}
    </span>
  );
}

function IncidentRow({ incident, sessionToken }) {
  const [expanded, setExpanded] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);

  const isPending = !incident.resolved_at;
  const catColor = CATEGORY_COLOR[incident.category] || "var(--text-secondary)";

  async function submitNote() {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const res = await api.planner.sreIncidentAction(incident.id, note, sessionToken);
      setConfirmation(res.message);
      setNoteOpen(false);
      setNote("");
    } catch (e) {
      setConfirmation(e.message || "Could not save that note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", marginBottom: 8, background: "var(--surface-card)", overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => setExpanded((v) => !v)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <IncidentIdBadge id={incident.id} />
              <PriorityBadge priority={incident.effective_priority} />
              {incident.effective_priority !== incident.priority && (
                <span style={{ fontSize: 9.5, color: "var(--danger)", fontWeight: 600 }}>↑ escalated from {incident.priority} (open {fmtHours(incident.elapsed_hours)})</span>
              )}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{incident.title}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 3, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ color: catColor, fontWeight: 600 }}>{incident.category}</span>
              <span>·</span>
              <span>{isPending ? `Open ${fmtHours(incident.elapsed_hours)}` : `Resolved in ${fmtHours(incident.elapsed_hours)}`}</span>
              {incident.pre_enriched && <span style={{ color: "var(--accent-primary)" }}>· ✨ Pre-enriched</span>}
            </div>
          </div>
          <span style={{ fontSize: 14, color: "var(--text-tertiary)", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border-default)" }}>
          <EnrichmentBlock incident={incident} />

          {isPending && (
            <div style={{ marginTop: 12 }}>
              {!noteOpen && (
                <button onClick={() => setNoteOpen(true)} style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 20, border: "1px solid var(--accent-primary)", background: "var(--accent-primary-tint)", color: "var(--accent-primary)", cursor: "pointer" }}>
                  📝 Add note
                </button>
              )}
              {noteOpen && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Escalated to platform team" style={{ flex: 1, fontSize: 12, padding: "6px 10px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }} />
                  <button disabled={busy} onClick={submitNote} style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: "var(--radius-md)", border: "none", background: "var(--accent-primary)", color: "#fff", cursor: "pointer" }}>
                    {busy ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
              {confirmation && <div style={{ fontSize: 12, color: "var(--success)", marginTop: 8 }}>✓ {confirmation}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LeaderboardCard({ teamBenchmark }) {
  if (!teamBenchmark) return null;
  const { team_size, nishant_rank, percentile, resolved_vs_team_median_pct, trend } = teamBenchmark;
  return (
    <div style={{ border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", padding: 18, background: "linear-gradient(135deg, var(--accent-primary-tint), var(--surface-canvas))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>🏆</span>
        <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: 0 }}>Team Standing</h3>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-primary)" }}>
        #{nishant_rank} <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>of {team_size} SREs</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
        You're in the top <strong>{100 - percentile + 10}%</strong> of your team this week, resolving incidents
        <strong> {resolved_vs_team_median_pct}% faster</strong> than the team median
        {trend === "up" ? " — and trending upward." : "."}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 8, fontStyle: "italic" }}>
        Individual teammate names and numbers stay private - this is just how you compare.
      </div>
    </div>
  );
}

function CategoryPerformanceCard({ categoryPerformance }) {
  return (
    <div style={{ border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", padding: 18, background: "var(--surface-card)" }}>
      <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: "0 0 12px" }}>Speed by Incident Type</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {categoryPerformance.map((c) => {
          const isFast = c.faster_than_peers_pct !== null && c.faster_than_peers_pct > 0;
          const isSlow = c.faster_than_peers_pct !== null && c.faster_than_peers_pct <= 0;
          return (
            <div key={c.category} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.category}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{c.count} resolved · avg {fmtHours(c.avg_resolution_hours)}</div>
              </div>
              {c.faster_than_peers_pct !== null && (
                <span style={{
                  fontSize: 11.5, fontWeight: 700,
                  color: isFast ? "var(--success)" : "var(--danger)",
                }}>
                  {isFast ? "↑" : "↓"} {Math.abs(c.faster_than_peers_pct)}% {isFast ? "faster" : "slower"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelfAssessmentCard({ selfAssessment }) {
  if (!selfAssessment || (!selfAssessment.strengths.length && !selfAssessment.growth_areas.length)) return null;
  return (
    <div style={{ border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", padding: 18, background: "var(--surface-card)", marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>🧭</span>
        <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>Self-Assessment</h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: selfAssessment.recommendation ? 14 : 0 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", textTransform: "uppercase", marginBottom: 6 }}>Your strengths</div>
          {selfAssessment.strengths.map((s) => (
            <div key={s.category} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, marginBottom: 4 }}>
                <strong>{s.category}</strong> — {s.faster_than_peers_pct}% faster than peers
              </div>
              {s.example_incident_ids?.length > 0 && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {s.example_incident_ids.map((id) => <IncidentIdBadge key={id} id={id} />)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", textTransform: "uppercase", marginBottom: 6 }}>Growth areas</div>
          {selfAssessment.growth_areas.map((s) => (
            <div key={s.category} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, marginBottom: 4 }}>
                <strong>{s.category}</strong> — {Math.abs(s.faster_than_peers_pct)}% slower than peers
              </div>
              {s.example_incident_ids?.length > 0 && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {s.example_incident_ids.map((id) => <IncidentIdBadge key={id} id={id} />)}
                </div>
              )}
              <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 3, fontStyle: "italic" }}>
                Worth a retrospective look - these took the longest in this category.
              </div>
            </div>
          ))}
        </div>
      </div>
      {selfAssessment.recommendation && (
        <div style={{ background: "var(--accent-primary-tint)", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 12.5, lineHeight: 1.6, color: "var(--text-primary)" }}>
          💡 {selfAssessment.recommendation}
        </div>
      )}
    </div>
  );
}

export default function SREDashboard() {
  const { session } = useSession();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    api.planner.getSreDashboard(session.sessionToken).then(setDashboard).catch((e) => setError(e.message));
  }, [session.sessionToken]);

  if (error) return <div style={{ padding: 32, color: "var(--danger)" }}>{error}</div>;
  if (!dashboard) return <div style={{ padding: 32, color: "var(--text-tertiary)", fontSize: 13 }}>Loading incident data…</div>;

  const { summary, daily_stats, incidents, category_performance, team_benchmark, self_assessment } = dashboard;
  const shown = incidents.filter((i) => (filter === "pending" ? !i.resolved_at : filter === "resolved" ? !!i.resolved_at : true));

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 4 }}>Signed in as <strong>{session.name}</strong> · {session.role}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Incident Reliability Dashboard</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: "0 0 24px" }}>
        Your incident queue this week - what Orbit pre-enriched before it reached you, and how your resolution time has trended.
      </p>

      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <StatCard label="Resolved this week" value={summary.resolved_count} accent="var(--success)" />
        <StatCard label="Currently pending" value={summary.pending_count} accent="var(--danger)" />
        <StatCard
          label="Pre-enriched by Orbit's ServiceNow IDM Agent"
          value={`${summary.pre_enriched_pct}%`}
          accent="var(--accent-primary)"
          sub={`${summary.pre_enriched_count} of ${summary.total_incidents} incidents`}
          tooltip="Incidents where the same enrichment pipeline that powers colleague-facing work notes also surfaced a root cause, category, and summary for you - vs. incidents you had to triage cold, like a pure infrastructure fault with no colleague-facing context to enrich."
        />
        <StatCard
          label="Avg. resolution time"
          value={`${summary.latest_avg_resolution_hours}h`}
          accent="var(--accent-secondary)"
          sub={summary.resolution_time_improvement_pct ? `↑ ${summary.resolution_time_improvement_pct}% faster than Monday` : null}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", padding: 18, background: "var(--surface-card)" }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: "0 0 10px" }}>Created vs Resolved, by day</h3>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>
            <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--border-strong)", borderRadius: 2, marginRight: 4 }} />Created</span>
            <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--success)", borderRadius: 2, marginRight: 4 }} />Resolved</span>
            <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>(hover a day for details)</span>
          </div>
          <CreatedResolvedChart dailyStats={daily_stats} />
        </div>
        <div style={{ border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", padding: 18, background: "var(--surface-card)" }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: "0 0 10px" }}>Average resolution time trend</h3>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic", marginBottom: 8 }}>(hover a point for the exact value)</div>
          <ResolutionTrendChart dailyStats={daily_stats} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20, marginBottom: 12 }}>
        <LeaderboardCard teamBenchmark={team_benchmark} />
        <CategoryPerformanceCard categoryPerformance={category_performance} />
      </div>

      <SelfAssessmentCard selfAssessment={self_assessment} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "28px 0 12px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Incidents</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {["pending", "resolved", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                border: filter === f ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
                background: filter === f ? "var(--accent-primary-tint)" : "var(--surface-canvas)",
                color: filter === f ? "var(--accent-primary)" : "var(--text-secondary)", fontWeight: 600,
              }}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {shown.map((incident) => (
        <IncidentRow key={incident.id} incident={incident} sessionToken={session.sessionToken} />
      ))}
    </div>
  );
}
