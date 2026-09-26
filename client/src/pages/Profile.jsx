import { useState } from 'react';
import { FormError, Spinner } from '../components/Feedback.jsx';
import { TextField } from '../components/Fields.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { RuleList } from './auth/AuthShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { usersService } from '../services/users.service.js';
import { EMAIL_RE, PASSWORD_RULES } from '../utils/constants.js';
import { formatDate, initials } from '../utils/format.js';

function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const dirty = form.fullName.trim() !== user.fullName || form.email.trim().toLowerCase() !== user.email;

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.fullName.trim().length < 2) found.fullName = 'Enter your full name';
    if (!EMAIL_RE.test(form.email.trim())) found.email = 'Enter a valid email address';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await usersService.updateProfile({ fullName: form.fullName.trim(), email: form.email.trim() });
      setUser((u) => ({ ...u, ...saved }));
      toast.success('Profile saved');
    } catch (err) {
      setErrors(err.fieldErrors ?? {});
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <div className="panel-h"><h2>Details</h2></div>
      <div className="panel-b" style={{ display: 'grid', gap: 14, paddingTop: 4 }}>
        <TextField label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={errors.fullName} autoComplete="name" />
        <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} autoComplete="email" />
        <TextField label="Login ID" value={user.loginId} disabled help="Login IDs cannot be changed" />
        <FormError error={error} fields={['fullName', 'email']} />
        <div className="form-actions"><button type="submit" className="btn pri" disabled={busy || !dirty}>{busy && <Spinner />} Save changes</button></div>
      </div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const empty = { currentPassword: '', password: '', confirmPassword: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.currentPassword) found.currentPassword = 'Enter your current password';
    if (!PASSWORD_RULES.every((r) => r.test(form.password))) found.password = 'Password does not meet all the rules';
    if (form.password !== form.confirmPassword) found.confirmPassword = 'Passwords do not match';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setError(null);
    try {
      await usersService.changePassword(form);
      setForm(empty);
      toast.success('Password changed. Other devices were logged out.');
    } catch (err) {
      setErrors(err.fieldErrors ?? {});
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <div className="panel-h"><h2>Change password</h2></div>
      <div className="panel-b" style={{ display: 'grid', gap: 14, paddingTop: 4 }}>
        <TextField label="Current password" type="password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} autoComplete="current-password" />
        <TextField label="New password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
        <RuleList rules={PASSWORD_RULES} value={form.password} />
        <TextField label="Re-enter new password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} autoComplete="new-password" />
        <FormError error={error} fields={['currentPassword', 'password', 'confirmPassword']} />
        <div className="form-actions"><button type="submit" className="btn pri" disabled={busy}>{busy && <Spinner />} Update password</button></div>
      </div>
    </form>
  );
}

export default function Profile() {
  useDocumentTitle('My profile');
  const { user } = useAuth();
  return (
    <div className="view">
      <PageHeader title="My profile" />
      <section className="panel panel-b" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="av" style={{ width: 52, height: 52, fontSize: 18, borderRadius: 14 }}>{initials(user.fullName)}</span>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 17 }}>{user.fullName}</b>
          <div className="muted">{user.email} · <span className="mono">{user.loginId}</span></div>
        </div>
        <span className={`role-tag${user.role === 'STAFF' ? ' staff' : ''}`}>{user.role === 'MANAGER' ? 'Inventory Manager' : 'Warehouse Staff'}</span>
        {user.createdAt && <span className="muted">Member since {formatDate(user.createdAt)}</span>}
      </section>
      <div className="grid-2e">
        <ProfileForm />
        <PasswordForm />
      </div>
    </div>
  );
}
