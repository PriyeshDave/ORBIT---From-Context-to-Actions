import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../context/SessionContext.jsx";
import { Avatar } from "../components/AppShell.jsx";
import TopHeader from "../components/TopHeader.jsx";
import OrbitAnimation from "../components/OrbitAnimation.jsx";

export default function Login() {
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listPersonas()
      .then((res) => setPersonas(res.personas))
      .catch((e) => setError(e.message));
  }, []);

  function selectPersona(persona) {
    setSelectedPersona(persona);
    setPassword("");
    setError(null);
  }

  function backToPersonaList() {
    setSelectedPersona(null);
    setPassword("");
    setError(null);
  }

  async function handleSubmitPassword(e) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      await login(selectedPersona.id, password);
      navigate("/");
    } catch (e) {
      setError(e.status === 401 ? "Incorrect password. Please try again." : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "var(--surface-canvas)" }}>
      <div style={{ height: 3, flexShrink: 0, background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))" }} />
      <TopHeader />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left: brand hero */}
        <div
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 40, background: "linear-gradient(180deg, var(--accent-primary-tint) 0%, var(--surface-canvas) 100%)",
            borderRight: "1px solid var(--border-accent)",
          }}
        >
          <OrbitAnimation size={280} />
          <div style={{ textAlign: "center", marginTop: 28, maxWidth: 420 }}>
            <h1 style={{ fontSize: 34, fontWeight: 800, margin: "0 0 8px", color: "var(--accent-primary)", letterSpacing: 0.5 }}>
              ORBIT
            </h1>
            <div style={{ fontSize: 16, fontWeight: 600, margin: "0 0 10px", color: "var(--text-primary)" }}>
              From Copilot to Control Tower
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              A system that keeps the colleague moving around their work.
            </p>
          </div>
        </div>

        {/* Right: login card */}
        <div style={{ width: 460, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, overflowY: "auto" }}>
          <div style={{ width: "100%" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>Sign in to continue to Orbit.</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 20px" }}>
              Your work, in motion!
            </p>

            {error && (
              <div
                style={{
                  background: "var(--danger-tint)", color: "var(--danger)", padding: "10px 14px",
                  borderRadius: "var(--radius-md)", fontSize: 13, marginBottom: 16, textAlign: "left",
                }}
              >
                {error}
              </div>
            )}

            {!selectedPersona && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPersona(p)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
                      background: "var(--surface-card)", cursor: "pointer",
                      transition: "border-color 120ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
                  >
                    <Avatar name={p.name} color={p.avatar_color} avatarUrl={`/avatars/${p.id}.jpg`} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{p.role}</div>
                    </div>
                    {p.connected_tools && (
                      <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", flexShrink: 0 }}>
                        {p.connected_tools.length}/4 tools
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedPersona && (
              <form onSubmit={handleSubmitPassword} style={{ textAlign: "left" }}>
                <button
                  type="button"
                  onClick={backToPersonaList}
                  style={{
                    background: "none", border: "none", color: "var(--accent-primary)",
                    fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16,
                  }}
                >
                  ← Choose a different colleague
                </button>

                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
                    background: "var(--surface-card)", marginBottom: 16,
                  }}
                >
                  <Avatar name={selectedPersona.name} color={selectedPersona.avatar_color} avatarUrl={`/avatars/${selectedPersona.id}.jpg`} size={40} />
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{selectedPersona.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{selectedPersona.role}</div>
                  </div>
                </div>

                <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: "100%", padding: "10px 12px", fontSize: 14, marginBottom: 14,
                    border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
                />

                <button
                  type="submit"
                  disabled={loading || !password}
                  style={{
                    width: "100%", background: "var(--accent-primary)", color: "#fff", border: "none",
                    borderRadius: "var(--radius-md)", padding: "11px 16px", fontSize: 14, fontWeight: 600,
                    cursor: loading || !password ? "default" : "pointer",
                    opacity: loading || !password ? 0.6 : 1,
                  }}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
