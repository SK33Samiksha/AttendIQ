import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { formatDate } from '../utils';
import useSubjects from '../useSubjects';
import EmptyRow from '../components/EmptyRow';

export default function Records() {
  const subjects = useSubjects();
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState(null); // null = loading

  // Subject and date filters are applied by the server; the search box filters in the browser
  useEffect(() => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (subjectId) params.set('subject_id', subjectId);
    apiFetch(`/attendance/by-date?${params}`).then((res) => setRecords(res.success ? res.data : []));
  }, [subjectId, date]);

  const q = search.toLowerCase();
  const rows = (records || []).filter(
    (r) => r.student_name.toLowerCase().includes(q) || String(r.roll_no).toLowerCase().includes(q)
  );

  return (
    <>
      <div className="page-header">
        <div><h1>Attendance Records</h1><p>View and filter all attendance entries</p></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row cols-3">
          <div className="form-group">
            <label htmlFor="fSubject">Subject</label>
            <select id="fSubject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="fDate">Date</label>
            <input id="fDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="fSearch">Search Student</label>
            <div className="search-bar">
              <span>🔍</span>
              <input id="fSearch" placeholder="Name or Roll No…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Records <span className="muted-small">({rows.length} records)</span></h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>#</th><th>Student</th><th>Roll No</th><th>Subject</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {records === null && <EmptyRow cols={6} icon="⏳" text="Loading…" />}
              {records !== null && rows.length === 0 && <EmptyRow cols={6} text="No records found." />}
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="muted-small">{i + 1}</td>
                  <td><strong>{r.student_name}</strong></td>
                  <td>{r.roll_no}</td>
                  <td>{r.subject_name}</td>
                  <td>{formatDate(r.date)}</td>
                  <td><span className={`badge ${r.status === 'Present' ? 'present' : 'absent'}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
