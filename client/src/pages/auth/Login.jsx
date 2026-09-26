import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FormError, Spinner } from '../../components/Feedback.jsx';
import { TextField } from '../../components/Fields.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import AuthShell from './AuthShell.jsx';

export default function Login() {
  useDocumentTitle('Log in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ loginId: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((x) => ({ ...x, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const missing = {};
    if (!form.loginId.trim()) missing.loginId = 'Enter your login ID';
    if (!form.password) missing.password = 'Enter your password';
    setErrors(missing);
    if (Object.keys(missing).length) return;

    setBusy(true);
    setError(null);
    try {
      await login(form.loginId.trim(), form.password);
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        const email = err.errors?.[0]?.message ?? '';
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, { state: { message: 'Verify your email to finish setting up your account.' } });
        return;
      }
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1>Welcome back</h1>
      <p className="lead">Log in to manage your inventory.</p>
      {location.state?.message && (
        <div className="banner g" role="status"><div><b>{location.state.message}</b></div></div>
      )}
      <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 13 }}>
        <TextField label="Login ID" value={form.loginId} onChange={set('loginId')} error={errors.loginId} autoComplete="username" autoFocus />
        <TextField label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="current-password" />
        <div className="row">
          <span />
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <FormError error={error} />
        <button type="submit" className="btn pri" disabled={busy}>
          {busy && <Spinner />} Log in
        </button>
      </form>
      <div className="alt">
        New to StockSense? <Link to="/signup">Create an account</Link>
      </div>
    </AuthShell>
  );
}
