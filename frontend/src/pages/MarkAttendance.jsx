import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { today } from '../utils';
import { useToast } from '../components/Toast';
import useSubjects from '../useSubjects';

export default function MarkAttendance() {
  const toast = useToast();
  const subjects = useSubjects();
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [markings, setMarkings] = useState({}); // { studentId: 'Present' | 'Absent' }
  const [saving, setSaving] = useState(false);

  // Whenever the subject or date changes, load the class and any attendance already saved
  useEffect(() => {
    if (!subjectId || !date) return;
    let cancelled = false; // ignore a slow old response if the user changed the selection again

    async function load() {
      const [sRes, aRes] = await Promise.all([
        apiFetch('/students'),
        apiFetch(`/attendance/by-date?date=${date}&subject_id=${subjectId}`),
      ]);
      if (cancelled) return;
      setStudents(sRes.success ? sRes.data : []);
      const saved = {};
      if (aRes.success) aRes.data.forEach((r) => { saved[r.student_id] = r.status; });
      setMarkings(saved);
    }
    load();
    return () => { cancelled = true; };
  }, [subjectId, date]);

  const mark = (id, status) => setMarkings((prev) => ({ ...prev, [id]: status }));
  const markAll = (status) => setMarkings(Object.fromEntries(students.map((s) => [s.id, status])));

  const present = Object.values(markings).filter((v) => v === 'Present').length;
  const absent = Object.values(markings).filter((v) => v === 'Absent').length;

  async function save() {
    if (!subjectId || !date) return toast('Select subject and date first.', 'error');
    if (!students.length) return toast('No students to mark.', 'error');

    // Students nobody clicked are saved as Absent, so ask first
    const unmarked = students.filter((s) => !markings[s.id]).length;
    if (unmarked && !window.confirm(`${unmarked} student(s) are not marked yet and will be saved as Absent. Continue?`)) return;

    setSaving(true);
    const records = students.map((s) => ({ student_id: s.id, status: markings[s.id] || 'Absent' }));
    const res = await apiFetch('/attendance/mark', { method: 'POST', body: { subject_id: subjectId, date, records } });
    setSaving(false);
    toast(res.message || (res.success ? 'Saved.' : 'Error saving attendance.'), res.success ? 'success' : 'error');
    if (res.success) setMarkings(Object.fromEntries(records.map((r) => [r.student_id, r.status])));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Mark Attendance</h1>
          <p>Select subject and date, then mark each student</p>
        </div>
      </div>

      <div className="card">
        <div className="form-row cols-3">
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <select id="subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">— Select Subject —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => markAll('Present')} disabled={!students.length}>✅ All Present</button>
              <button className="btn btn-secondary" onClick={() => markAll('Absent')} disabled={!students.length}>❌ All Absent</button>
            </div>
          </div>
        </div>
      </div>

      {subjectId && students.length > 0 && (
        <div className="summary-bar">
          <span>Total: <strong>{students.length}</strong></span>
          <span>Present: <span id="presentCount">{present}</span></span>
          <span>Absent: <span id="absentCount">{absent}</span></span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            💾 &nbsp;{saving ? 'Saving…' : 'Save Attendance'}
          </button>
        </div>
      )}

      {!subjectId && (
        <div className="empty-state"><div className="icon">📚</div><p>Choose a subject to load the class.</p></div>
      )}
      {subjectId && students.length === 0 && (
        <div className="empty-state"><div className="icon">👥</div><p>No students found. Add students first.</p></div>
      )}

      <div className="attendance-grid">
        {subjectId && students.map((s) => {
          const status = markings[s.id];
          return (
            <div key={s.id} className={`student-card ${status === 'Present' ? 'present' : status === 'Absent' ? 'absent' : ''}`}>
              <div className="student-info">
                <div className="s-avatar">{s.name.charAt(0)}</div>
                <div>
                  <div className="s-name">{s.name}</div>
                  <div className="s-roll">Roll: {s.roll_no}{s.class ? ` · ${s.class}` : ''}</div>
                </div>
              </div>
              <div className="toggle-group">
                <button className={`toggle-btn ${status === 'Present' ? 'p-active' : ''}`}
                  aria-label={`Mark ${s.name} present`} onClick={() => mark(s.id, 'Present')}>P</button>
                <button className={`toggle-btn ${status === 'Absent' ? 'a-active' : ''}`}
                  aria-label={`Mark ${s.name} absent`} onClick={() => mark(s.id, 'Absent')}>A</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
