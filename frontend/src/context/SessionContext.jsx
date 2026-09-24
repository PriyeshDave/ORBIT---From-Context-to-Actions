import { createContext, useContext, useState, useCallback } from "react";
import { api } from "../api/client";

const SessionContext = createContext(null);

const STORAGE_KEY = "orbit_session";

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (personaId, password) => {
    const res = await api.login(personaId, password);
    const s = {
      sessionToken: res.session_token,
      personaId: res.persona_id,
      name: res.name,
      role: res.role,
      avatarColor: res.avatar_color,
      connectedTools: res.connected_tools || [],
      hasSreDashboard: res.has_sre_dashboard || false,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
