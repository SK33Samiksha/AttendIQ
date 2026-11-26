import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { formatDate } from '../utils';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import EmptyRow from '../components/EmptyRow';

const EMPTY_ACCOUNT = { name: '', email: '', password: '', role: 'teacher' };

// Admin only: approve teacher requests, add accounts, disable/enable, reset passwords.
export default function Users() {
  const { user: me } = useAuth();
  const { refreshPending } = useOutletContext(); // updates the sidebar badge
  const toast = useToast();
  const [users, setUsers] = useState(null); // null = loading
  const [adding, setAdding] = useState(false);
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [resetFor, setResetFor] = useState(null); // the user whose password is being reset
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(async () => {
    const res = await apiFetch('/users');
    setUsers(res.success ? res.data : []);
    refreshPending();
  }, [refreshPending]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(u, status) {
    if (status === 'disabled' && !window.confirm(
      `Disable ${u.name}'s account? They will be signed out and cannot sign in until you enable it again. Their attendance records are kept.`
    )) return;
    const res = await apiFetch(`/users/${u.id}/status`, { method: 'PATCH', body: { status } });
    toast(res.message || 'Done.', res.success ? 'success' : 'error');
    load();
  }

  async function reject(u) {
    if (!window.confirm(`Reject the request from ${u.name} (${u.email})?`)) return;
    const res = await apiFetch(`/users/${u.id}`, { method: 'DELETE' });
    toast(res.message || 'Done.', res.success ? 'success' : 'error');
    load();
  }

  async function createAccount() {
    const body = { ...account, name: account.name.trim(), email: account.email.trim() };
    if (!body.name || !body.email || !body.password) return toast('Please fill in all fields.', 'error');
    if (body.password.length < 8) return toast('Password must be at least 8 characters.', 'error');
    const res = await apiFetch('/users', { method: 'POST', body });
    if (!res.success) return toast(res.message || 'Could not create the account.', 'error');
    toast(res.message);
    setAdding(false);
    setAccount(EMPTY_ACCOUNT);
    load();
  }

  async function resetPassword() {
    if (newPassword.length < 8) return toast('Password must be at least 8 characters.', 'error');
    const res = await apiFetch(`/users/${resetFor.id}/reset-password`, { method: 'POST', body: { password: newPassword } });
    toast(res.message || 'Done.', res.success ? 'success' : 'error');
    if (res.success) { setResetFor(null); setNewPassword(''); }
  }

  const pending = (users || []).filter((u) => u.status === 'pending');
  const others = (users || []).filter((u) => u.status !== 'pending');
  const updateAccount = (field) => (e) => setAccount({ ...account, [field]: e.target.value });

  return (
    <>
      <div className="page-header">
        <div><h1>Staff Accounts</h1><p>Approve teacher requests and manage who can sign in</p></div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Account</button>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Waiting for approval</h3>
          <p className="muted-small" style={{ marginBottom: 14 }}>
            These teachers requested an account from the sign-in page. Approve the ones you recognise.
          </p>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Requested</th><th>Actions</th></tr></thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>{formatDate(u.created_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setStatus(u, 'active')}>Approve</button>
                      <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} onClick={() => reject(u)}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 14 }}>All accounts</h3>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users === null && <EmptyRow cols={6} icon="⏳" text="Loading…" />}
              {users !== null && others.length === 0 && <EmptyRow cols={6} text="No accounts yet." />}
              {others.map((u, i) => (
                <tr key={u.id}>
                  <td className="muted-small">{i + 1}</td>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td className="capitalize">{u.role}</td>
                  <td><span className={`badge ${u.status} capitalize`}>{u.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {u.id === me.id ? (
                      <span className="muted-small">(you)</span>
                    ) : u.status === 'active' ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => setStatus(u, 'disabled')}>Disable</button>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => setStatus(u, 'active')}>Enable</button>
                    )}
                    <button className="btn btn-secondary btn-sm" style={{ marginLeft: 6 }} onClick={() => setResetFor(u)}>
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {adding && (
        <Modal title="Add Staff Account" onClose={() => setAdding(false)}>
          <div className="form-row cols-2">
            <div className="form-group">
              <label htmlFor="uName">Full Name *</label>
              <input id="uName" placeholder="e.g. Prof. Rao" autoFocus value={account.name} onChange={updateAccount('name')} />
            </div>
            <div className="form-group">
              <label htmlFor="uEmail">Email *</label>
              <input id="uEmail" type="email" placeholder="name@school.com" value={account.email} onChange={updateAccount('email')} />
            </div>
          </div>
          <div className="form-row cols-2">
            <div className="form-group">
              <label htmlFor="uPassword">Password * (min. 8 characters)</label>
              <input id="uPassword" type="password" autoComplete="new-password" value={account.password} onChange={updateAccount('password')} />
            </div>
            <div className="form-group">
              <label htmlFor="uRole">Role</label>
              <select id="uRole" value={account.role} onChange={updateAccount('role')}>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={createAccount}>Create Account</button>
          </div>
        </Modal>
      )}

      {resetFor && (
        <Modal title={`Reset password for ${resetFor.name}`} onClose={() => { setResetFor(null); setNewPassword(''); }}>
          <div className="form-group">
            <label htmlFor="resetPw">New password (at least 8 characters)</label>
            <input id="resetPw" type="password" autoComplete="new-password" autoFocus
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <p className="muted-small" style={{ marginTop: 10 }}>Tell them the new password; they can change it after signing in.</p>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => { setResetFor(null); setNewPassword(''); }}>Cancel</button>
            <button className="btn btn-primary" onClick={resetPassword}>Reset Password</button>
          </div>
        </Modal>
      )}
    </>
  );
}
