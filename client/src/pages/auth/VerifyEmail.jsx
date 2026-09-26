import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FormError, Spinner } from '../../components/Feedback.jsx';
import OtpInput from '../../components/OtpInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useCountdown } from '../../hooks/useCountdown.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { authService } from '../../services/auth.service.js';
import AuthShell from './AuthShell.jsx';

const RESEND_SECONDS = 60;

// Second step of sign-up (and of logging in to an unverified account)
export default function VerifyEmail() {
  useDocumentTitle('Verify email');
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState('');
  const [busy, setBusy] = useState(false);
  // A code was just sent by sign-up or login, so resending unlocks after a minute
  const [cooldown, setCooldown] = useCountdown(RESEND_SECONDS);

  if (!email) {
    return (
      <AuthShell>
        <h1>Verify your email</h1>
        <p className="lead">Start from sign-up or log in, and we will send you a code.</p>
        <Link to="/login" className="btn pri">Go to log in</Link>
      </AuthShell>
    );
  }

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setFieldError('Enter the 6-digit code');
    setBusy(true);
    setError(null);
    setFieldError('');
    try {
      const user = await authService.verifyEmail(email, code);
      setUser(user);
      toast.success(`Email verified. Welcome, ${user.fullName.split(' ')[0]}!`);
      navigate('/', { replace: true });
    } catch (err) {
      setFieldError(err.fieldErrors?.code ?? '');
      setError(err);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const resend = async () => {
    setError(null);
    try {
      await authService.resendVerification(email);
      setCooldown(RESEND_SECONDS);
      setCode('');
      toast.success('A new code is on its way');
    } catch (err) {
      setError(err);
    }
  };

  return (
    <AuthShell>
      <div className="stepper" aria-label="Step 2 of 2">
        <span className="d" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><i>✓</i> Account</span>
        <hr />
        <span className="c" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><i>2</i> Verify email</span>
      </div>
      <form onSubmit={verify} noValidate style={{ display: 'grid', gap: 13 }}>
        <h1>Check your inbox</h1>
        {location.state?.message && <div className="banner i"><div><b>{location.state.message}</b></div></div>}
        <p className="lead">We sent a 6-digit code to <b>{email}</b>. It expires in 10 minutes.</p>
        <OtpInput value={code} onChange={(v) => { setCode(v); setFieldError(''); }} />
        {fieldError && <span className="help e">{fieldError}</span>}
        <FormError error={error} fields={['code']} />
        <button type="submit" className="btn pri" disabled={busy}>{busy && <Spinner />} Verify and continue</button>
        <div className="row">
          <span className="muted">Didn’t get it? Check spam.</span>
          <button type="button" className="linkbtn" onClick={resend} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </form>
      <div className="alt">
        Wrong email? <Link to="/signup">Sign up again</Link> · <Link to="/login">Log in</Link>
      </div>
    </AuthShell>
  );
}
