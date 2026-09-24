import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { SessionProvider, useSession } from "./context/SessionContext.jsx";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import AppShell from "./components/AppShell.jsx";

import CopilotHome from "./pages/catchup/CopilotHome.jsx";
import MeetingWorkspace from "./pages/catchup/MeetingWorkspace.jsx";
import CatchupSystemFlow from "./pages/catchup/SystemFlow.jsx";

import Planner from "./pages/planner/Planner.jsx";
import PlannerSystemFlow from "./pages/planner/SystemFlow.jsx";

import ReadinessChat from "./pages/readiness/Chat.tsx";
import ReadinessFlow from "./pages/readiness/Flow.tsx";

import SREDashboard from "./pages/sre/SREDashboard.jsx";

function RequireSession({ children }) {
  const { session } = useSession();
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function Shell({ children }) {
  return (
    <RequireSession>
      <AppShell>{children}</AppShell>
    </RequireSession>
  );
}

function Routed() {
  const { session } = useSession();
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={<Shell><Home /></Shell>} />

      <Route path="/catchup" element={<Shell><CopilotHome /></Shell>} />
      <Route path="/catchup/meeting/:meetingId" element={<Shell><MeetingWorkspace /></Shell>} />
      <Route path="/catchup/meeting/:meetingId/system-flow" element={<Shell><CatchupSystemFlow /></Shell>} />

      <Route path="/planner" element={<Shell><Planner /></Shell>} />
      <Route path="/planner/system-flow" element={<Shell><PlannerSystemFlow /></Shell>} />

      <Route path="/readiness" element={<Shell><ReadinessChat /></Shell>} />
      <Route path="/readiness/flow" element={<Shell><ReadinessFlow /></Shell>} />

      <Route path="/sre" element={<Shell><SREDashboard /></Shell>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <Routed />
      </HashRouter>
    </SessionProvider>
  );
}
