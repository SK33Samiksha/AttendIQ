// frontend/js/app.js  — shared utilities

const API = 'http://localhost:5000/api';

// ── Auth helpers ────────────────────────────────────────────
function getToken()  { return localStorage.getItem('token'); }
function getUser()   { return JSON.parse(localStorage.getItem('user') || '{}'); }
function requireAuth() {
  if (!getToken()) { window.location.href = 'index.html'; return false; }
  return true;
}
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// ── Fetch wrapper ────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (res.status === 401 || res.status === 403) { logout(); }
  return data;
}

// ── Toast notifications ──────────────────────────────────────
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = (type === 'success' ? '✓  ' : '✕  ') + msg;
  t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.classList.remove('show'); }, 3200);
}

// ── Render sidebar ────────────────────────────────────────────
function renderSidebar(activePage) {
  const user = getUser();
  const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  const navItems = [
    { href: 'dashboard.html',   icon: '📊', label: 'Dashboard',  id: 'dashboard' },
    { href: 'mark.html',        icon: '✏️',  label: 'Mark Attendance', id: 'mark' },
    { href: 'records.html',     icon: '📋', label: 'Records',    id: 'records' },
    { href: 'students.html',    icon: '👥', label: 'Students',   id: 'students' },
    { href: 'subjects.html',    icon: '📚', label: 'Subjects',   id: 'subjects' },
    { href: 'reports.html',     icon: '📈', label: 'Reports',    id: 'reports' },
  ];

  return `
    <div class="sidebar-brand">
      <div class="brand-icon">📋</div>
      <div>
        <div class="brand-name">AttendIQ</div>
        <div class="brand-sub">Management System</div>
      </div>
    </div>
    <nav>
      <div class="nav-section-label">Navigation</div>
      ${navItems.map(item => `
        <a href="${item.href}" class="nav-item ${activePage === item.id ? 'active' : ''}">
          <span class="nav-icon">${item.icon}</span> ${item.label}
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="user-avatar">${initials}</div>
        <div>
          <div class="user-name">${user.name || 'User'}</div>
          <div class="user-role">${user.role || 'teacher'}</div>
        </div>
      </div>
      <button class="btn-logout" onclick="logout()">Sign Out</button>
    </div>
  `;
}

// ── Date helpers ─────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}
function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

// ── Pct class ────────────────────────────────────────────────
function pctClass(p) {
  if (p >= 75) return 'high';
  if (p >= 50) return 'mid';
  return 'low';
}
