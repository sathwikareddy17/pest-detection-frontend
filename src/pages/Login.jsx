import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, isAuthed } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthed) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
      nav("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setCredentials = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError("");
  };

  return (
    <div className="login-wrap">
      <form className="card login-card form" onSubmit={submit}>
        <div>
          <h1>🐛 PestWatch</h1>
          <p className="muted">Sign in to the pest detection console</p>
        </div>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <div className="error muted" style={{ color: "var(--red)" }}>
            {error}
          </div>
        )}
        <button className="btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border, #eee)", paddingTop: "0.75rem" }}>
          <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            Demo Accounts:
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
              onClick={() => setCredentials("admin", "admin123")}
            >
              Admin (admin123)
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
              onClick={() => setCredentials("priya", "field123")}
            >
              Field User (field123)
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
