import React from 'react';
import Icon from '../../components/Icon';

/**
 * Profile — opened from the profile menu at the bottom of the sidebar.
 */

const defaultUser = {
  initials: 'PJ',
  fullName: 'Purvika Jain',
  role: 'Inventory Manager',
  warehouse: 'Main Warehouse',
  loginId: 'purvika',
  email: 'purvika_2315185@gndec.ac.in',
  passwordChanged: '12 days ago',
};

export default function Profile({ user = defaultUser, onLogout, onChangePassword }) {
  return (
    <main className="view">
      <div className="panel" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
        <span className="av" style={{ width: 64, height: 64, fontSize: 22, borderRadius: 18 }}>{user.initials}</span>
        <div style={{ flex: 1 }}>
          <b style={{ fontFamily: 'Bricolage Grotesque', fontSize: 22, fontWeight: 700 }}>{user.fullName}</b>
          <div style={{ color: 'var(--muted)' }}>{user.role} · {user.warehouse}</div>
        </div>
        <span className="btn dan" onClick={onLogout}><Icon name="logout" />Log out</span>
      </div>

      <div className="doc">
        <div className="doc-body">
          <div className="sect">Account</div>
          <div className="grid2">
            <div className="fld"><label>Full name</label><div className="inp">{user.fullName}</div></div>
            <div className="fld"><label>Login ID</label><div className="inp mono" style={{ background: 'var(--bg)' }}>{user.loginId}</div></div>
            <div className="fld"><label>Email ID</label><div className="inp"><Icon name="mail" />{user.email}</div></div>
            <div className="fld"><label>Role</label><div className="inp">{user.role}<Icon name="chev" className="i end" /></div></div>
          </div>

          <div className="sect">Security</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
            <div>
              <b>Password</b>
              <div className="help">Last changed {user.passwordChanged}</div>
            </div>
            <span className="btn sm" onClick={onChangePassword}>Change with OTP</span>
          </div>
        </div>
      </div>
    </main>
  );
}