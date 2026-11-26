import { useState } from 'react';
import Modal from './Modal';
import { apiFetch } from '../api';
import { useToast } from './Toast';

// "Change password" dialog, opened from the sidebar on every page.
export default function PasswordModal({ onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function save() {
    if (!form.current || !form.next) return toast('Please fill in all fields.', 'error');
    if (form.next.length < 8) return toast('New password must be at least 8 characters.', 'error');
    if (form.next !== form.confirm) return toast('The new passwords do not match.', 'error');

    setSaving(true);
    const res = await apiFetch('/auth/change-password', {
      method: 'POST',
      body: { currentPassword: form.current, newPassword: form.next },
    });
    setSaving(false);
    if (res.success) {
      toast(res.message);
      onClose();
    } else {
      toast(res.message || 'Could not change the password.', 'error');
    }
  }

  return (
    <Modal title="Change Password" onClose={onClose}>
      <div className="form-group" style={{ marginBottom: 14 }}>
        <label htmlFor="pwCurrent">Current Password</label>
        <input id="pwCurrent" type="password" autoComplete="current-password" autoFocus
          value={form.current} onChange={update('current')} />
      </div>
      <div className="form-row cols-2">
        <div className="form-group">
          <label htmlFor="pwNew">New Password (min. 8)</label>
          <input id="pwNew" type="password" autoComplete="new-password"
            value={form.next} onChange={update('next')} />
        </div>
        <div className="form-group">
          <label htmlFor="pwNew2">Confirm New Password</label>
          <input id="pwNew2" type="password" autoComplete="new-password"
            value={form.confirm} onChange={update('confirm')} />
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Change Password'}
        </button>
      </div>
    </Modal>
  );
}
