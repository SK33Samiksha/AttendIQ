import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import PasswordModal from './PasswordModal';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/mark',      icon: '✏️', label: 'Mark Attendance' },
  { to: '/records',   icon: '📋', label: 'Records' },
  { to: '/students',  icon: '👥', label: 'Students' },
  { to: '/subjects',  icon: '📚', label: 'Subjects' },
  { to: '/reports',   icon: '📈', label: 'Reports' },
];

// The frame around every page after sign-in: sidebar on the left (a slide-in
// menu on phones) and the current page on the right (<Outlet />).
export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(0); // teacher sign-up requests waiting (admin only)

  const refreshPending = useCallback(async () => {
    if (!isAdmin) return;
    const res = await apiFetch('/users/pending-count');
    setPending(res.success ? res.data.pending : 0);
  }, [isAdmin]);

  // Close the phone menu and refresh the badge whenever the page changes
  useEffect(() => {
    setMenuOpen(false);
    refreshPending();
  }, [location.pathname, refreshPending]);

  const initials = (user.name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const items = isAdmin ? [...NAV_ITEMS, { to: '/users', icon: '🔑', label: 'Staff Accounts' }] : NAV_ITEMS;

  return (
    <>
      <div className="mobile-topbar">
        <button aria-label="Open menu" onClick={() => setMenuOpen(true)}>☰</button>
        <span className="brand-name">AttendIQ</span>
      </div>
      <div className={`sidebar-backdrop ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} />

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">📋</div>
          <div>
            <div className="brand-name">AttendIQ</div>
            <div className="brand-sub">Management System</div>
          </div>
        </div>

        <nav>
          <div className="nav-section-label">Navigation</div>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span> {item.label}
              {item.to === '/users' && pending > 0 && <span className="nav-badge">{pending}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div>
              <div className="user-name">{user.name || 'User'}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          <button className="btn-link-light" onClick={() => { setMenuOpen(false); setShowPassword(true); }}>
            Change password
          </button>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        {/* Pages can read { pending, refreshPending } with useOutletContext() */}
        <Outlet context={{ pending, refreshPending }} />
      </main>

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} />}
    </>
  );
}
