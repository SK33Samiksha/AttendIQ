import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { pctClass } from '../utils';
import useSubjects from '../useSubjects';
import EmptyRow from '../components/EmptyRow';

export default function Reports() {
  const subjects = useSubjects();
  const [subjectId, setSubjectId] = useState('');
  const [min, setMin] = useState(0);
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null); // null = loading

  useEffect(() => {
    const url = subjectId ? `/attendance/summary?subject_id=${subjectId}` : '/attendance/summary';
    apiFetch(url).then((res) => setData(res.success ? res.data : []));
  }, [subjectId]);

  const q = search.toLowerCase();
  const rows = (data || []).filter((r) => r.student_name.toLowerCase().includes(q) && Number(r.percentage) >= min);

  return (
    <>
      <div className="page-header">
        <div><h1>Reports</h1><p>Attendance percentage summary per student</p></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row cols-3">
          <div className="form-group">
            <label htmlFor="rSubject">Filter by Subject</label>
            <select id="rSubject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="rMin">Min Percentage</label>
            <select id="rMin" value={min} onChange={(e) => setMin(Number(e.target.value))}>
              <option value={0}>All</option>
              <option value={75}>≥ 75% (Good)</option>
              <option value={50}>≥ 50% (Average)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="rSearch">Search</label>
            <div className="search-bar">
              <span>🔍</span>
              <input id="rSearch" placeholder="Student name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="legend">
        <span><span className="badge high">■</span> ≥75% Good</span>
        <span><span className="badge mid">■</span> 50–74% Average</span>
        <span><span className="badge low">■</span> &lt;50% Poor</span>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Percentage Summary</h3>
          <span className="muted-small">{rows.length} record(s)</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Student</th><th>Roll No</th><th>Class</th><th>Subject</th>
                <th>Total</th><th>Present</th><th>Absent</th><th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {data === null && <EmptyRow cols={9} icon="⏳" text="Loading…" />}
              {data !== null && rows.length === 0 && <EmptyRow cols={9} text="No data found." />}
              {rows.map((r, i) => {
                const cls = pctClass(r.percentage);
                return (
                  <tr key={`${r.student_id}-${r.subject_id}`}>
                    <td className="muted-small">{i + 1}</td>
                    <td><strong>{r.student_name}</strong></td>
                    <td>{r.roll_no}</td>
                    <td>{r.class || '—'}</td>
                    <td>{r.subject_name}</td>
                    <td className="center">{r.total_classes}</td>
                    <td className="center text-green">{r.present_count}</td>
                    <td className="center text-red">{r.absent_count}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`badge ${cls}`}>{r.percentage}%</span>
                        <div className="pct-bar" style={{ width: 80, flexShrink: 0 }}>
                          <div className={`pct-fill ${cls}`} style={{ width: `${Math.min(Number(r.percentage) || 0, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
