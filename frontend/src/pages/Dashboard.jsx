import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { pctClass } from '../utils';
import EmptyRow from '../components/EmptyRow';

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { pending } = useOutletContext(); // from Layout
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null); // null = still loading

  useEffect(() => {
    apiFetch('/attendance/stats').then((res) => res.success && setStats(res.data));
    apiFetch('/attendance/summary').then((res) => setSummary(res.success ? res.data : []));
  }, []);

  const statCards = [
    { icon: '👥', color: 'orange', label: 'Total Students', value: stats?.total_students },
    { icon: '✅', color: 'green',  label: 'Present Today',  value: stats?.present_today },
    { icon: '📚', color: 'blue',   label: 'Subjects',       value: stats?.total_subjects },
    { icon: '📈', color: 'amber',  label: 'Avg Attendance %', value: stats && `${stats.avg_percentage}%` },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{greeting()}, {user.name || 'Teacher'} 👋</h1>
          <p>Here's your attendance overview for today</p>
        </div>
        <Link to="/mark" className="btn btn-primary">✏️ &nbsp;Mark Attendance</Link>
      </div>

      {isAdmin && pending > 0 && (
        <div className="notice">
          <span>🧑‍🏫 <strong>{pending}</strong> teacher request{pending > 1 ? 's are' : ' is'} waiting for your approval.</span>
          <Link to="/users" className="btn btn-primary btn-sm">Review</Link>
        </div>
      )}

      <div className="stats-grid">
        {statCards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className={`stat-icon ${card.color}`}>{card.icon}</div>
            <div>
              <div className="stat-value">{card.value ?? '—'}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-head">
            <h3>Attendance Summary</h3>
            <Link to="/reports" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Student</th><th>Subject</th><th>Present</th><th>%</th></tr>
              </thead>
              <tbody>
                {summary === null && <EmptyRow cols={4} icon="⏳" text="Loading…" />}
                {summary?.length === 0 && <EmptyRow cols={4} text="No summary data yet." />}
                {summary?.slice(0, 8).map((r) => {
                  const cls = pctClass(r.percentage);
                  return (
                    <tr key={`${r.student_id}-${r.subject_id}`}>
                      <td>
                        <strong>{r.student_name}</strong><br />
                        <span className="muted-small">{r.roll_no}</span>
                      </td>
                      <td>{r.subject_name}</td>
                      <td>{r.present_count}/{r.total_classes}</td>
                      <td>
                        <span className={`badge ${cls}`}>{r.percentage}%</span>
                        <div className="pct-bar" style={{ marginTop: 4, width: 60 }}>
                          <div className={`pct-fill ${cls}`} style={{ width: `${Math.min(Number(r.percentage) || 0, 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Quick Actions</h3></div>
          <div className="quick-actions">
            <Link to="/mark" className="btn btn-primary">✏️ Mark Today's Attendance</Link>
            <Link to="/records" className="btn btn-secondary">📋 View Records</Link>
            <Link to="/students" className="btn btn-secondary">👥 Manage Students</Link>
            <Link to="/subjects" className="btn btn-secondary">📚 Manage Subjects</Link>
            <Link to="/reports" className="btn btn-secondary">📈 View Reports</Link>
          </div>
          <div className="today-box">
            <p className="label">Today's Date</p>
            <p className="value">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="label" style={{ marginTop: 8 }}>Total Records in DB</p>
            <p className="value accent">{stats?.total_records ?? '—'}</p>
          </div>
        </div>
      </div>
    </>
  );
}
