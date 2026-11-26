import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import EmptyRow from '../components/EmptyRow';

const EMPTY_FORM = { name: '', roll_no: '', email: '', class: '' };

export default function Students() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [students, setStudents] = useState(null); // null = loading
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);   // null = dialog closed, {} = add, {id,...} = edit
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    const res = await apiFetch('/students');
    setStudents(res.success ? res.data : []);
  }, []);
  useEffect(() => { load(); }, [load]);

  function openDialog(student) {
    setEditing(student || {});
    setForm(student
      ? { name: student.name, roll_no: student.roll_no, email: student.email || '', class: student.class || '' }
      : EMPTY_FORM);
  }

  async function save() {
    const body = {
      name: form.name.trim(), roll_no: form.roll_no.trim(),
      email: form.email.trim(), class: form.class.trim(),
    };
    if (!body.name || !body.roll_no) return toast('Name and Roll No are required.', 'error');

    const res = editing.id
      ? await apiFetch(`/students/${editing.id}`, { method: 'PUT', body })
      : await apiFetch('/students', { method: 'POST', body });
    if (!res.success) return toast(res.message || 'Error saving student.', 'error');
    toast(res.message);
    setEditing(null);
    load();
  }

  async function remove(student) {
    if (!window.confirm(`Delete student "${student.name}"? This will also delete their attendance records.`)) return;
    const res = await apiFetch(`/students/${student.id}`, { method: 'DELETE' });
    toast(res.success ? 'Student deleted.' : res.message, res.success ? 'success' : 'error');
    if (res.success) load();
  }

  const q = search.toLowerCase();
  const filtered = (students || []).filter(
    (s) => s.name.toLowerCase().includes(q) || String(s.roll_no).toLowerCase().includes(q)
  );
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <>
      <div className="page-header">
        <div><h1>Students</h1><p>Manage student records</p></div>
        <button className="btn btn-primary" onClick={() => openDialog()}>+ Add Student</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <span>🔍</span>
            <input placeholder="Search by name or roll no…" aria-label="Search students"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="muted-small" style={{ whiteSpace: 'nowrap' }}>{filtered.length} student(s)</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Roll No</th><th>Email</th><th>Class</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {students === null && <EmptyRow cols={6} icon="⏳" text="Loading…" />}
              {students !== null && filtered.length === 0 && <EmptyRow cols={6} icon="👤" text="No students found." />}
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  <td className="muted-small">{i + 1}</td>
                  <td>
                    <div className="name-cell">
                      <div className="initial-circle">{s.name.charAt(0)}</div>
                      <strong>{s.name}</strong>
                    </div>
                  </td>
                  <td>{s.roll_no}</td>
                  <td>{s.email || <span className="muted-small">—</span>}</td>
                  <td>{s.class || <span className="muted-small">—</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openDialog(s)}>Edit</button>
                    {isAdmin && (
                      <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} onClick={() => remove(s)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit Student' : 'Add Student'} onClose={() => setEditing(null)}>
          <div className="form-row cols-2">
            <div className="form-group">
              <label htmlFor="sName">Full Name *</label>
              <input id="sName" placeholder="e.g. Rahul Patil" autoFocus value={form.name} onChange={update('name')} />
            </div>
            <div className="form-group">
              <label htmlFor="sRoll">Roll No *</label>
              <input id="sRoll" placeholder="e.g. 101" value={form.roll_no} onChange={update('roll_no')} />
            </div>
          </div>
          <div className="form-row cols-2">
            <div className="form-group">
              <label htmlFor="sEmail">Email</label>
              <input id="sEmail" type="email" placeholder="student@email.com" value={form.email} onChange={update('email')} />
            </div>
            <div className="form-group">
              <label htmlFor="sClass">Class</label>
              <input id="sClass" placeholder="e.g. MCA-1" value={form.class} onChange={update('class')} />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save Student</button>
          </div>
        </Modal>
      )}
    </>
  );
}
