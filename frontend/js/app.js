// frontend/js/app.js  — shared utilities

// The pages are served by the same server as the API, so a relative path works
// on localhost, from another device on the network, and when deployed.
const API = '/api';

// ── Safety: escape text before putting it into HTML ─────────
// Student and subject names are typed by users. Without escaping, a name like
// <img src=x onerror=alert(1)> would run code in every teacher's browser.
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Auth helpers ────────────────────────────────────────────
function getToken()  { return localStorage.getItem('token'); }
function getUser()   {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); }
  catch { return {}; }
}
function isAdmin()   { return getUser().role === 'admin'; }
function requireAuth() {
  if (!getToken()) { window.location.href = 'index.html'; return false; }
  return true;
}
function requireAdminPage() {
  if (!requireAuth()) return false;
  if (!isAdmin()) { window.location.href = 'dashboard.html'; return false; }
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
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    return { success: false, message: 'Cannot reach the server. Is the backend running?' };
  }
  const data = await res.json().catch(() => ({ success: false, message: `Request failed (${res.status}).` }));
  // 401 = not logged in / session expired. (403 just means "not allowed", so stay logged in.)
  if (res.status === 401) { logout(); }
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

// ── Phone menu ───────────────────────────────────────────────
// Adds a top bar with a ☰ button that opens the sidebar on small screens.
function setupMobileNav() {
  if (document.querySelector('.mobile-topbar')) return;
  const bar = document.createElement('div');
  bar.className = 'mobile-topbar';
  bar.innerHTML = '<button aria-label="Open menu" onclick="toggleNav(true)">☰</button><span class="brand-name">AttendIQ</span>';
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.onclick = () => toggleNav(false);
  document.body.prepend(bar);
  document.body.appendChild(backdrop);
}
function toggleNav(open) {
  document.getElementById('sidebar')?.classList.toggle('open', open);
  document.querySelector('.sidebar-backdrop')?.classList.toggle('show', open);
}

// ── Render sidebar ────────────────────────────────────────────
function renderSidebar(activePage) {
  setupMobileNav();
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
  if (user.role === 'admin') {
    navItems.push({ href: 'users.html', icon: '🔑', label: 'Staff Accounts', id: 'users' });
    setTimeout(loadPendingBadge, 0);
  }

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
          ${item.id === 'users' ? '<span class="nav-badge" id="pendingBadge" hidden></span>' : ''}
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="user-avatar">${esc(initials)}</div>
        <div>
          <div class="user-name">${esc(user.name || 'User')}</div>
          <div class="user-role">${esc(user.role || 'teacher')}</div>
        </div>
      </div>
      <button class="btn-link-light" onclick="openPasswordModal()">Change password</button>
      <button class="btn-logout" onclick="logout()">Sign Out</button>
    </div>
  `;
}

// ── Admin: number of teacher sign-up requests waiting ───────
async function loadPendingBadge() {
  const res = await apiFetch('/users/pending-count');
  const n = res.success ? res.data.pending : 0;
  const badge = document.getElementById('pendingBadge');
  if (badge) { badge.textContent = n; badge.hidden = !n; }
  return n;
}

// ── Change my password (modal available on every page) ─────
function openPasswordModal() {
  toggleNav(false);
  let overlay = document.getElementById('pwOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'pwOverlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Change Password</h3>
        <div class="form-group" style="margin-bottom:14px;">
          <label>Current Password</label>
          <input type="password" id="pwCurrent" autocomplete="current-password"/>
        </div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label>New Password (min. 8)</label>
            <input type="password" id="pwNew" autocomplete="new-password"/>
          </div>
          <div class="form-group">
            <label>Confirm New Password</label>
            <input type="password" id="pwNew2" autocomplete="new-password"/>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closePasswordModal()">Cancel</button>
          <button class="btn btn-primary" onclick="savePassword()">Change Password</button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closePasswordModal(); });
    document.body.appendChild(overlay);
  }
  overlay.classList.add('open');
  document.getElementById('pwCurrent').focus();
}
function closePasswordModal() {
  const overlay = document.getElementById('pwOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  ['pwCurrent', 'pwNew', 'pwNew2'].forEach(id => document.getElementById(id).value = '');
}
async function savePassword() {
  const currentPassword = document.getElementById('pwCurrent').value;
  const newPassword = document.getElementById('pwNew').value;
  if (!currentPassword || !newPassword) return showToast('Please fill in all fields.', 'error');
  if (newPassword.length < 8) return showToast('New password must be at least 8 characters.', 'error');
  if (newPassword !== document.getElementById('pwNew2').value) return showToast('The new passwords do not match.', 'error');
  const res = await apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
  if (res.success) { showToast(res.message, 'success'); closePasswordModal(); }
  else showToast(res.message || 'Could not change the password.', 'error');
}

// ── Date helpers ─────────────────────────────────────────────
// Today's date in the user's own time zone as YYYY-MM-DD.
// (toISOString() uses UTC, which gave yesterday's date in India before 5:30 am.)
function today() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// Accepts 'YYYY-MM-DD' (or a longer date-time string) and shows e.g. "15 Jan 2024"
function formatDate(d) {
  const day = String(d || '').slice(0, 10);
  const parsed = new Date(day + 'T00:00:00');
  if (Number.isNaN(parsed.getTime())) return esc(d || '—');
  return parsed.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

// ── Pct class ────────────────────────────────────────────────
function pctClass(p) {
  if (p >= 75) return 'high';
  if (p >= 50) return 'mid';
  return 'low';
}
