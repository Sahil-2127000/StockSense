import { useState } from 'react';
import DataTable, { Pagination, SearchBox } from '../components/DataTable.jsx';
import { Empty, ErrorState } from '../components/Feedback.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { usePage } from '../hooks/usePage.js';
import { usersService } from '../services/users.service.js';
import { formatDate, initials } from '../utils/format.js';

export default function Users() {
  useDocumentTitle('Users');
  const { user: me } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim());
  const [role, setRole] = useState('');
  const [page, setPage] = usePage(`${q}|${role}`);
  const [savingId, setSavingId] = useState(null);

  const users = useApi(() => usersService.list({ q, role, page, limit: 20 }), [q, role, page]);

  const change = async (u, patch, message) => {
    setSavingId(u.id);
    try {
      const saved = await usersService.update(u.id, patch);
      users.setData((list) => list.map((x) => (x.id === saved.id ? saved : x)));
      toast.success(message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="view">
      <PageHeader title="Users" sub="Promote staff to manager or deactivate accounts. Deactivated users are logged out immediately." />
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Name, login ID or email" />
        <select className="inp sm" style={{ width: 'auto' }} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          <option value="MANAGER">Managers</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>
      <ErrorState error={users.error} onRetry={users.reload} />
      <section className="panel">
        <DataTable
          loading={users.loading}
          rows={users.data}
          empty={<Empty icon="users" title="No users found" />}
          columns={[
            {
              key: 'name', label: 'User', render: (u) => (
                <div className="pname">
                  <span className="av" style={{ width: 30, height: 30, fontSize: 11 }}>{initials(u.fullName)}</span>
                  <div><b>{u.fullName}{u.id === me.id && <span className="muted"> (you)</span>}</b><small>{u.loginId}</small></div>
                </div>
              ),
            },
            { key: 'email', label: 'Email' },
            { key: 'since', label: 'Joined', render: (u) => formatDate(u.createdAt) },
            {
              key: 'role', label: 'Role', render: (u) => (
                <select className="inp sm" style={{ width: 130 }} value={u.role} disabled={u.id === me.id || savingId === u.id}
                  onChange={(e) => change(u, { role: e.target.value }, `${u.fullName} is now ${e.target.value === 'MANAGER' ? 'a manager' : 'staff'}`)}
                  aria-label={`Role of ${u.fullName}`}>
                  <option value="MANAGER">Manager</option>
                  <option value="STAFF">Staff</option>
                </select>
              ),
            },
            {
              key: 'active', label: 'Status', align: 'right', render: (u) => (
                <button type="button" className={`btn sm${u.isActive ? '' : ' ok'}`} disabled={u.id === me.id || savingId === u.id}
                  onClick={() => change(u, { isActive: !u.isActive }, u.isActive ? `${u.fullName} deactivated` : `${u.fullName} reactivated`)}>
                  {u.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
              ),
            },
          ]}
        />
        <Pagination meta={users.meta} onPage={setPage} />
      </section>
    </div>
  );
}
