import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormError, Spinner } from '../../components/Feedback.jsx';
import { TextField } from '../../components/Fields.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { authService } from '../../services/auth.service.js';
import { EMAIL_RE, PASSWORD_RULES } from '../../utils/constants.js';
import AuthShell, { RuleList } from './AuthShell.jsx';

const RESEND_SECONDS = 60;

function Stepper({ step }) {
  const steps = ['Email', 'Code', 'New password'];
  return (
    <div className="stepper" aria-label={`Step ${step + 1} of 3`}>
      {steps.map((label, i) => (
        <span key={label} style={{ display: 'contents' }}>
          {i > 0 && <hr />}
          <span className={i < step ? 'd' : i === step ? 'c' : undefined} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <i>{i < step ? '✓' : i + 1}</i> {label}
          </span>
        </span>
      ))}
    </div>
  );
}

// Six single-digit boxes; typing or pasting moves focus along
function OtpInput({ value, onChange }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  const setAt = (index, digit) => {
    const next = digits.map((d, i) => (i === index ? digit : d)).join('').replace(/\s+$/, '');
    onChange(next.replace(/ /g, ''));
  };

  return (
    <div className="otp" onPaste={(e) => {
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (pasted) {
        e.preventDefault();
        onChange(pasted);
        refs.current[Math.min(pasted.length, 5)]?.focus();
      }
    }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          aria-label={`Digit ${i + 1}`}
          autoFocus={i === 0}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, '').slice(-1);
            setAt(i, digit || ' ');
            if (digit) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => e.key === 'Backspace' && !d.trim() && refs.current[i - 1]?.focus()}
        />
      ))}
    </div>
  );
}

export default function ForgotPassword() {
  useDocumentTitle('Reset password');
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setErrors(err.fieldErrors ?? {});
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (e) => {
    e?.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setErrors({ email: 'Enter a valid email address' });
    setErrors({});
    return run(async () => {
      await authService.forgotPassword(email.trim());
      setCooldown(RESEND_SECONDS);
      setCode('');
      setStep(1);
    });
  };

  const verify = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setErrors({ code: 'Enter the 6-digit code' });
    setErrors({});
    return run(async () => {
      const result = await authService.verifyOtp(email.trim(), code);
      setResetToken(result.resetToken);
      setStep(2);
    });
  };

  const reset = (e) => {
    e.preventDefault();
    const found = {};
    if (!PASSWORD_RULES.every((r) => r.test(password))) found.password = 'Password does not meet all the rules';
    if (password !== confirmPassword) found.confirmPassword = 'Passwords do not match';
    setErrors(found);
    if (Object.keys(found).length) return undefined;
    return run(async () => {
      await authService.resetPassword(resetToken, password, confirmPassword);
      navigate('/login', { replace: true, state: { message: 'Password updated. Log in with your new password.' } });
    });
  };

  return (
    <AuthShell>
      <Stepper step={step} />
      {step === 0 && (
        <form onSubmit={sendCode} noValidate style={{ display: 'grid', gap: 13 }}>
          <h1>Forgot your password?</h1>
          <p className="lead">Enter your account email and we will send you a 6-digit code.</p>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" autoFocus />
          <FormError error={error} fields={['email']} />
          <button type="submit" className="btn pri" disabled={busy}>{busy && <Spinner />} Send code</button>
        </form>
      )}
      {step === 1 && (
        <form onSubmit={verify} noValidate style={{ display: 'grid', gap: 13 }}>
          <h1>Check your inbox</h1>
          <p className="lead">If an account exists for <b>{email}</b>, a code is on its way. It expires in 10 minutes.</p>
          <OtpInput value={code} onChange={(v) => { setCode(v); setErrors({}); }} />
          {errors.code && <span className="help e">{errors.code}</span>}
          <FormError error={error} fields={['code']} />
          <button type="submit" className="btn pri" disabled={busy}>{busy && <Spinner />} Verify code</button>
          <div className="row">
            <button type="button" className="linkbtn" onClick={() => setStep(0)}>Change email</button>
            <button type="button" className="linkbtn" onClick={sendCode} disabled={cooldown > 0 || busy}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={reset} noValidate style={{ display: 'grid', gap: 13 }}>
          <h1>Choose a new password</h1>
          <p className="lead">Same rules as sign-up. Other devices will be logged out.</p>
          <TextField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="new-password" autoFocus />
          <RuleList rules={PASSWORD_RULES} value={password} />
          <TextField label="Re-enter password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={errors.confirmPassword} autoComplete="new-password" />
          <FormError error={error} fields={['password', 'confirmPassword']} />
          <button type="submit" className="btn pri" disabled={busy}>{busy && <Spinner />} Update password</button>
        </form>
      )}
      <div className="alt">
        Remembered it? <Link to="/login">Back to log in</Link>
      </div>
    </AuthShell>
  );
}
