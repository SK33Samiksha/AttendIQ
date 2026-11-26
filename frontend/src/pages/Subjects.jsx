import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

const COLORS = ['#e85d04', '#3b82f6', '#16a34a', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899'];

export default function Subjects() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [subjects, setSubjects] = useState(null); // null = loading
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    const res = await apiFetch('/subjects');
    setSubjects(res.success ? res.data : []);
  }, []);
  useEffect(() => { load(); }, [load]);

  function close() {
    setAdding(false);
    setName('');
    setCode('');
  }

  async function save() {
    if (!name.trim() || !code.trim()) return toast('Name and Code are required.', 'error');
    const res = await apiFetch('/subjects', { method: 'POST', body: { name: name.trim(), code: code.trim().toUpperCase() } });
    if (!res.success) return toast(res.message || 'Error.', 'error');
    toast('Subject added!');
    close();
    load();
  }

  async function remove(subject) {
    if (!window.confirm(`Delete subject "${subject.name}"? All attendance for this subject will also be deleted.`)) return;
    const res = await apiFetch(`/subjects/${subject.id}`, { method: 'DELETE' });
    toast(res.success ? 'Subject deleted.' : res.message, res.success ? 'success' : 'error');
    if (res.success) load();
  }

  return (
    <>
      <div className="page-header">
        <div><h1>Subjects</h1><p>Manage course subjects</p></div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Subject</button>
      </div>

      <div className="subject-grid">
        {subjects === null && <div className="empty-state"><div className="icon">⏳</div><p>Loading…</p></div>}
        {subjects?.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="icon">📚</div><p>No subjects yet. Add your first subject.</p>
          </div>
        )}
        {subjects?.map((s, i) => {
          const color = COLORS[i % COLORS.length];
          return (
            <div className="subject-card" key={s.id}>
              <div className="subject-icon" style={{ background: `${color}15`, color }}>📖</div>
              <div style={{ flex: 1 }}>
                <div className="subject-name">{s.name}</div>
                <div className="muted-small">Code: <strong style={{ color }}>{s.code}</strong></div>
              </div>
              {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => remove(s)}>Delete</button>}
            </div>
          );
        })}
      </div>

      {adding && (
        <Modal title="Add Subject" onClose={close}>
          <div className="form-row cols-2">
            <div className="form-group">
              <label htmlFor="subName">Subject Name *</label>
              <input id="subName" placeholder="e.g. Java Programming" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="subCode">Subject Code *</label>
              <input id="subCode" placeholder="e.g. JAVA" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={close}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Add Subject</button>
          </div>
        </Modal>
      )}
    </>
  );
}
