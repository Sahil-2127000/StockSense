import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormError, Spinner } from '../../components/Feedback.jsx';
import { TextField } from '../../components/Fields.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { authService } from '../../services/auth.service.js';
import { EMAIL_RE, LOGIN_ID_RE, PASSWORD_RULES } from '../../utils/constants.js';
import AuthShell, { RuleList } from './AuthShell.jsx';

const FIELDS = ['loginId', 'email', 'fullName', 'password', 'confirmPassword'];

// Same rules as the server (the server re-checks everything)
const validate = (f) => {
  const e = {};
  if (!LOGIN_ID_RE.test(f.loginId.trim())) e.loginId = 'Login ID must be 6–12 letters, numbers or underscore';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (f.fullName.trim().length < 2) e.fullName = 'Enter your full name';
  if (!PASSWORD_RULES.every((r) => r.test(f.password))) e.password = 'Password does not meet all the rules';
  if (f.password !== f.confirmPassword) e.confirmPassword = 'Passwords do not match';
  return e;
};

export default function Signup() {
  useDocumentTitle('Create account');
  const navigate = useNavigate();
  const [form, setForm] = useState({ loginId: '', email: '', fullName: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((x) => ({ ...x, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setError(null);
    try {
      await authService.signup({ ...form, loginId: form.loginId.trim(), email: form.email.trim(), fullName: form.fullName.trim() });
      navigate('/login', { replace: true, state: { message: 'Account created. You can log in now.' } });
    } catch (err) {
      setErrors(err.fieldErrors ?? {});
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1>Create your account</h1>
      <p className="lead">New accounts start as warehouse staff. A manager can change your role.</p>
      <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 12 }}>
        <TextField label="Full name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} autoComplete="name" autoFocus />
        <TextField
          label="Login ID"
          value={form.loginId}
          onChange={set('loginId')}
          error={errors.loginId}
          help="6–12 characters: letters, numbers or underscore"
          autoComplete="username"
          maxLength={12}
        />
        <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        <TextField label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
        <RuleList rules={PASSWORD_RULES} value={form.password} />
        <TextField
          label="Re-enter password"
          type="password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
        <FormError error={error} fields={FIELDS} />
        <button type="submit" className="btn pri" disabled={busy}>
          {busy && <Spinner />} Create account
        </button>
      </form>
      <div className="alt">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </AuthShell>
  );
}
