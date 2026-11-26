// The two-panel frame used by the Sign in and Request account pages.
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="grid-bg" />
      <div className="login-wrapper">
        <div className="left-panel">
          <div className="brand">
            <div className="brand-icon">📋</div>
            <div>
              <div className="brand-name">AttendIQ</div>
              <div className="brand-sub">Management System</div>
            </div>
          </div>
          <div className="left-copy">
            <h1>Track every <span>session</span> with precision.</h1>
            <p>A smart, fast attendance system built for educators who value their time.</p>
          </div>
          <ul className="feature-list">
            <li>Mark attendance in seconds</li>
            <li>Auto-calculate percentages</li>
            <li>Instant reports &amp; insights</li>
            <li>Secure MySQL database</li>
          </ul>
        </div>

        <div className="right-panel">
          <div className="form-head">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
