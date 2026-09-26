import { useMemo, useState } from "react";
import Icon from "../../icons/Icon";

// Swap this for a real API/debounced check once the backend exists.
async function checkLoginIdAvailable(id) {
  const taken = ["purvika", "admin"];
  return !taken.includes(id.toLowerCase());
}
async function checkEmailAvailable(email) {
  const taken = ["purvika_2315185@gndec.ac.in"];
  return !taken.includes(email.toLowerCase());
}

function passwordRules(pw) {
  return {
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
    length: pw.length > 8,
  };
}

export default function Signup({ onSignup, onGoLogin }) {
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loginIdStatus, setLoginIdStatus] = useState(null); // null | 'checking' | 'ok' | 'taken' | 'invalid'
  const [emailStatus, setEmailStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const rules = useMemo(() => passwordRules(password), [password]);
  const allRulesPass = rules.lower && rules.upper && rules.special && rules.length;
  const passwordsMatch = confirm.length > 0 && confirm === password;
  const loginIdValid = loginId.length >= 6 && loginId.length <= 12;

  async function handleLoginIdBlur() {
    if (!loginIdValid) {
      setLoginIdStatus("invalid");
      return;
    }
    setLoginIdStatus("checking");
    const ok = await checkLoginIdAvailable(loginId);
    setLoginIdStatus(ok ? "ok" : "taken");
  }

  async function handleEmailBlur() {
    if (!email.includes("@")) return;
    setEmailStatus("checking");
    const ok = await checkEmailAvailable(email);
    setEmailStatus(ok ? "ok" : "taken");
  }

  const canSubmit =
    loginIdStatus === "ok" && emailStatus === "ok" && allRulesPass && passwordsMatch && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSignup?.({ loginId, email, password });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth" style={{ gridTemplateColumns: "1fr", minHeight: "100vh" }}>
      <div className="auth-form" style={{ padding: "28px 36px" }}>
        <form className="af" style={{ maxWidth: 520 }} onSubmit={handleSubmit}>
          <div className="logo" style={{ padding: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#5C84FF,#2F5BEA)" }} />
            <b style={{ color: "var(--ink)" }}>StockSense</b>
          </div>
          <h1>Create your account</h1>

          <div className="grid2" style={{ gap: "12px 16px" }}>
            <div className="fld">
              <label>Login ID</label>
              <div className={`inp ${loginIdStatus === "taken" || loginIdStatus === "invalid" ? "err" : loginIdStatus === "ok" ? "" : ""}`}>
                <input
                  style={{ border: "none", outline: "none", flex: 1, font: "inherit", color: "inherit" }}
                  value={loginId}
                  onChange={(e) => { setLoginId(e.target.value); setLoginIdStatus(null); }}
                  onBlur={handleLoginIdBlur}
                  placeholder="e.g. aman.shaikh"
                />
                {loginIdStatus === "ok" && <Icon name="check" style={{ color: "var(--in)" }} />}
              </div>
              {loginIdStatus === "ok" && <div className="help g">Available · {loginId.length} characters</div>}
              {loginIdStatus === "taken" && <div className="help e">This login ID is already taken</div>}
              {loginIdStatus === "invalid" && <div className="help e">Must be 6–12 characters</div>}
              {loginIdStatus === null && <div className="help">Login ID: unique, 6–12 characters</div>}
            </div>

            <div className="fld">
              <label>Email ID</label>
              <div className={`inp ${emailStatus === "taken" ? "err" : ""}`}>
                <input
                  style={{ border: "none", outline: "none", flex: 1, font: "inherit", color: "inherit" }}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailStatus(null); }}
                  onBlur={handleEmailBlur}
                  placeholder="you@example.com"
                />
              </div>
              {emailStatus === "taken" && <div className="help e">This email already has an account</div>}
              {emailStatus === "ok" && <div className="help g">Available</div>}
            </div>

            <div className="fld">
              <label>Password</label>
              <div className="inp focus">
                <input
                  style={{ border: "none", outline: "none", flex: 1, font: "inherit", color: "inherit" }}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="fld">
              <label>Re-enter password</label>
              <div className={`inp ${confirm && !passwordsMatch ? "err" : ""}`}>
                <input
                  style={{ border: "none", outline: "none", flex: 1, font: "inherit", color: "inherit" }}
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {confirm && !passwordsMatch && <div className="help e">Passwords don't match</div>}
            </div>
          </div>

          <div className="rules">
            <span className={rules.lower ? "y" : "n"}><Icon name={rules.lower ? "check" : "x"} />One lowercase letter</span>
            <span className={rules.upper ? "y" : "n"}><Icon name={rules.upper ? "check" : "x"} />One uppercase letter</span>
            <span className={rules.special ? "y" : "n"}><Icon name={rules.special ? "check" : "x"} />One special character</span>
            <span className={rules.length ? "y" : "n"}><Icon name={rules.length ? "check" : "x"} />More than 8 characters</span>
          </div>

          <button type="submit" className={`btn pri ${canSubmit ? "" : "dis"}`} disabled={!canSubmit}>
            {submitting ? "Creating account…" : "Sign up"}
          </button>

          <div className="alt">
            Already have an account? <a onClick={onGoLogin}>Sign in</a>
          </div>
        </form>
      </div>
    </div>
  );
}
