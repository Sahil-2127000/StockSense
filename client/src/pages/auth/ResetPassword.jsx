import { useEffect, useRef, useState } from "react";
import Icon from "../../icons/Icon";

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

function Stepper({ step }) {
  const steps = ["Email", "Verify code", "New password"];
  return (
    <div className="stepper">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <span key={label} style={{ display: "contents" }}>
            <span className={done ? "d" : current ? "c" : ""} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <i>{done ? "✓" : n}</i>
              {current || done ? <span style={{ color: current ? "var(--ink)" : undefined }}>{label}</span> : label}
            </span>
            {n < steps.length && <hr />}
          </span>
        );
      })}
    </div>
  );
}

export default function ResetPassword({ onComplete, onGoLogin }) {
  const [step, setStep] = useState(1); // 1 = email, 2 = otp, 3 = new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const inputsRef = useRef([]);

  useEffect(() => {
    if (step !== 2 || seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, seconds]);

  function maskedEmail(e) {
    const [name, domain] = e.split("@");
    if (!domain) return e;
    return `${name.slice(0, 2)}•••••@${domain}`;
  }

  function handleSendCode(e) {
    e.preventDefault();
    if (!email.includes("@")) return;
    // Replace with the real "send OTP" API call.
    setStep(2);
    setSeconds(RESEND_SECONDS);
  }

  function handleOtpChange(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
  }

  function handleVerify(e) {
    e.preventDefault();
    if (otp.join("").length !== OTP_LENGTH) return;
    // Replace with the real "verify OTP" API call.
    setStep(3);
  }

  function handleResend() {
    if (seconds > 0) return;
    setSeconds(RESEND_SECONDS);
    // Replace with the real "resend OTP" API call.
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    if (password.length <= 8 || password !== confirm) return;
    await onComplete?.({ email, password });
  }

  return (
    <div className="auth" style={{ gridTemplateColumns: "1fr", minHeight: "100vh" }}>
      <div className="auth-form" style={{ padding: "28px 36px" }}>
        <div className="af" style={{ maxWidth: 420 }}>
          <Stepper step={step} />

          {step === 1 && (
            <form onSubmit={handleSendCode} style={{ display: "grid", gap: 15 }}>
              <h1>Reset your password</h1>
              <p className="lead">Enter the email on your account and we'll send a 6-digit code.</p>
              <div className="fld">
                <label>Email ID</label>
                <div className="inp">
                  <Icon name="mail" />
                  <input
                    style={{ border: "none", outline: "none", flex: 1, font: "inherit", color: "inherit" }}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button type="submit" className="btn pri">Send code</button>
              <div className="alt">
                <a onClick={onGoLogin}>Back to sign in</a>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerify} style={{ display: "grid", gap: 15 }}>
              <h1>Check your inbox</h1>
              <p className="lead">
                We sent a 6-digit code to <b style={{ color: "var(--ink)" }}>{maskedEmail(email)}</b>.
              </p>
              <div className="otp">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputsRef.current[i] = el)}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    maxLength={1}
                    inputMode="numeric"
                  />
                ))}
              </div>
              <div className="row">
                <span className="help">
                  {seconds > 0 ? (
                    <>Didn't get it? Resend in <b className="mono">00:{String(seconds).padStart(2, "0")}</b></>
                  ) : (
                    <a onClick={handleResend}>Resend code</a>
                  )}
                </span>
                <a onClick={() => setStep(1)}>Use a different email</a>
              </div>
              <button type="submit" className="btn pri">Verify code</button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleSetPassword} style={{ display: "grid", gap: 15 }}>
              <h1>Set a new password</h1>
              <p className="lead">Same rules as sign-up — at least 9 characters, mixed case, one special character.</p>
              <div className="fld">
                <label>New password</label>
                <div className="inp">
                  <input
                    style={{ border: "none", outline: "none", flex: 1, font: "inherit", color: "inherit" }}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="fld">
                <label>Confirm new password</label>
                <div className={`inp ${confirm && confirm !== password ? "err" : ""}`}>
                  <input
                    style={{ border: "none", outline: "none", flex: 1, font: "inherit", color: "inherit" }}
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                {confirm && confirm !== password && <div className="help e">Passwords don't match</div>}
              </div>
              <button type="submit" className="btn pri">Set password &amp; sign in</button>
              <div className="banner i">
                <Icon name="lock" />
                <div>
                  <b>You'll be signed in automatically</b>
                  <p>After this step you're taken straight to the dashboard.</p>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
