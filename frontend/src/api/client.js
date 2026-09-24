/**
 * Unified API client for Orbit. One base URL, one auth mechanism
 * (x-session-token from a single login), three capability namespaces
 * matching the backend's router prefixes.
 *
 * API_BASE defaults to "" (same-origin, relative paths) so a production
 * build works behind any reverse proxy without knowing its own domain or
 * IP in advance - nginx forwards /api/* to the backend container. Only
 * set VITE_API_BASE_URL when the frontend and backend are served from
 * genuinely different origins (e.g. `npm run dev` locally without the
 * nginx proxy in front).
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const WS_BASE = API_BASE.replace(/^http/, "ws");

function authHeaders(sessionToken) {
  return sessionToken ? { "x-session-token": sessionToken } : {};
}

async function handleResponse(res) {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore parse errors on error body
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  base: API_BASE,

  // ---------- Shared auth ----------
  listPersonas: () => fetch(`${API_BASE}/api/personas`).then(handleResponse),

  login: (personaId, password) =>
    fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona_id: personaId, password }),
    }).then(handleResponse),

  // ---------- Home dashboard ----------
  homeSummary: (sessionToken) =>
    fetch(`${API_BASE}/api/home/summary`, { headers: authHeaders(sessionToken) }).then(handleResponse),

  // ---------- Catch Up (RecapPilot) ----------
  catchup: {
    getNotifications: (sessionToken) =>
      fetch(`${API_BASE}/api/catchup/notifications`, { headers: authHeaders(sessionToken) }).then(handleResponse),

    acknowledgeNotification: (notificationId, sessionToken) =>
      fetch(`${API_BASE}/api/catchup/notifications/${notificationId}/acknowledge`, {
        method: "POST",
        headers: authHeaders(sessionToken),
      }).then(handleResponse),

    searchMeetings: (query, sessionToken) =>
      fetch(`${API_BASE}/api/catchup/meetings/search?query=${encodeURIComponent(query)}`, {
        headers: authHeaders(sessionToken),
      }).then(handleResponse),

    getMeeting: (meetingId, sessionToken) =>
      fetch(`${API_BASE}/api/catchup/meetings/${meetingId}`, { headers: authHeaders(sessionToken) }).then(handleResponse),

    getTranscript: (meetingId, sessionToken) =>
      fetch(`${API_BASE}/api/catchup/meetings/${meetingId}/transcript`, { headers: authHeaders(sessionToken) }).then(handleResponse),

    getRunLog: (meetingId, sessionToken) =>
      fetch(`${API_BASE}/api/catchup/meetings/${meetingId}/run-log`, { headers: authHeaders(sessionToken) }).then(handleResponse),

    chat: (meetingId, message, sessionToken) =>
      fetch(`${API_BASE}/api/catchup/meetings/${meetingId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(sessionToken) },
        body: JSON.stringify({ meeting_id: meetingId, message }),
      }).then(handleResponse),

    sendFollowup: (meetingId, message, sessionToken) =>
      fetch(`${API_BASE}/api/catchup/meetings/${meetingId}/followup/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(sessionToken) },
        body: JSON.stringify({ meeting_id: meetingId, message }),
      }).then(handleResponse),

    streamPipeline: (meetingId, sessionToken) => {
      const url = `${API_BASE}/api/catchup/meetings/${meetingId}/run-pipeline-stream?x_session_token=${encodeURIComponent(sessionToken)}`;
      return new EventSource(url);
    },
  },

  // ---------- Planner (FocusPilot) ----------
  planner: {
    toolsStatus: (sessionToken) =>
      fetch(`${API_BASE}/api/planner/tools/status`, { headers: authHeaders(sessionToken) }).then(handleResponse),

    mcpDiscovery: (sessionToken) =>
      fetch(`${API_BASE}/api/planner/mcp/discovery`, { headers: authHeaders(sessionToken) }).then(handleResponse),

    getRunLog: (timeOfDay, sessionToken) =>
      fetch(`${API_BASE}/api/planner/plan/run-log?time_of_day=${timeOfDay}`, { headers: authHeaders(sessionToken) }).then(handleResponse),

    sendFeedback: (timeOfDay, itemTitle, feedback, note, sessionToken) =>
      fetch(`${API_BASE}/api/planner/plan/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(sessionToken) },
        body: JSON.stringify({ time_of_day: timeOfDay, item_title: itemTitle, feedback, note }),
      }).then(handleResponse),

    updatePlanStatus: (timeOfDay, itemTitle, status, note, sessionToken) =>
      fetch(`${API_BASE}/api/planner/plan/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(sessionToken) },
        body: JSON.stringify({ time_of_day: timeOfDay, item_title: itemTitle, status, note: note || null }),
      }).then(handleResponse),

    getSreDashboard: (sessionToken) =>
      fetch(`${API_BASE}/api/planner/sre/dashboard`, { headers: authHeaders(sessionToken) }).then(handleResponse),

    sreIncidentAction: (incidentId, note, sessionToken) =>
      fetch(`${API_BASE}/api/planner/sre/incidents/${incidentId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(sessionToken) },
        body: JSON.stringify({ note }),
      }).then(handleResponse),

    chat: (message, sessionToken) =>
      fetch(`${API_BASE}/api/planner/plan/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(sessionToken) },
        body: JSON.stringify({ message }),
      }).then(handleResponse),

    streamPlan: (timeOfDay, freeText, sessionToken) => {
      const params = new URLSearchParams({ time_of_day: timeOfDay, x_session_token: sessionToken });
      if (freeText) params.set("free_text", freeText);
      return new EventSource(`${API_BASE}/api/planner/plan/run-stream?${params.toString()}`);
    },
  },

  // ---------- Readiness (ReadinessIQ) ----------
  readiness: {
    wsUrl: () => `${WS_BASE}/api/readiness/ws/chat`,

    listRuns: () => fetch(`${API_BASE}/api/readiness/flow/runs`).then(handleResponse),

    getRun: (runId) => fetch(`${API_BASE}/api/readiness/flow/runs/${runId}`).then(handleResponse),

    uploadDoc: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return fetch(`${API_BASE}/api/readiness/uploads`, { method: "POST", body: formData }).then(handleResponse);
    },
  },
};
