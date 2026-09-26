import { useState } from "react";
import Icon from "../../icons/Icon";

const LEDGER = [
  { ref: "WH/IN/0009", desc: "Keyboard · Deco Addict", delta: "+40", tone: "p" },
  { ref: "WH/OUT/0006", desc: "Monitor 24″ · Gemini Furniture", delta: "−12", tone: "m" },
  { ref: "WH/INT/0002", desc: "Desk · Stock1 → Branch", delta: "⇄ 5", tone: "int" },
  { ref: "WH/ADJ/0002", desc: "Steel Rod · damaged", delta: "−3 kg", tone: "m" },
];

export default function Login({ onLogin, onGoSignup, onGoReset }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!loginId || !password) {
      setError("Enter your login ID and password");
      return;
    }
    setSubmitting(true);
    try {
      // Replace with the real auth call once the API is ready.
      await onLogin?.({ loginId, password, keepSignedIn });
    } catch (err) {
      setError("Invalid Login Id or Password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-art">
        <div className="logo" style={{ padding: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#5C84FF,#2F5BEA)" }} />
          <div>
            <b>StockSense</b>
            <small>Smart inventory &amp; warehouse management</small>
          </div>
        </div>
        <h2>Every unit, every rack, <em>accounted for.</em></h2>
        <p>Receipts, deliveries, transfers and adjustments in one live ledger. No registers, no stray spreadsheets.</p>
        <div className="ledger">
          {LEDGER.map((row) => (
            <div key={row.ref}>
              <span className="mono">{row.ref}</span>
              <span>{row.desc}</span>
              <span className={row.tone === "int" ? "" : row.tone} style={row.tone === "int" ? { color: "#B7A6FF", fontFamily: "JetBrains Mono", fontWeight: 700 } : undefined}>
                {row.delta}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-form">
        <form className="af" onSubmit={handleSubmit}>
          <h1>Welcome back</h1>
          <p className="lead">Sign in to your inventory workspace.</p>

          <div className="fld">
            <label>Login ID</label>
            <div className={`inp ${error ? "" : ""}`}>
              <Icon name="user" />
              <input
                style={{ border: "none", outline: "none", flex: 1, font: "inherit", color: "inherit" }}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. John"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="fld">
            <label>Password</label>
            <div className={`inp ${error ? "err" : ""}`}>
              <Icon name="lock" />
              <input
                style={{ border: "none", outline: "none", flex: 1, font: "inherit", color: "inherit" }}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <span className="end" onClick={() => setShowPassword((s) => !s)}>
                <Icon name="eye" />
              </span>
            </div>
            {error && <div className="help e">{error}</div>}
          </div>

          <div className="row">
            <span className="check" onClick={() => setKeepSignedIn((v) => !v)}>
              <span className={`box ${keepSignedIn ? "on" : ""}`}>
                {keepSignedIn && <Icon name="check" size={10} style={{ strokeWidth: 3 }} />}
              </span>
              Keep me signed in
            </span>
            <a onClick={onGoReset}>Forgot password?</a>
          </div>

          <button type="submit" className="btn pri" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <div className="alt">
            New to StockSense? <a onClick={onGoSignup}>Create an account</a>
          </div>
        </form>
      </div>
    </div>
  );
}
