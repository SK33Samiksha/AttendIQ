import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AuthShell from '../components/AuthShell';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // stop the browser reloading the page
    setError('');
    if (!email.trim() || !password) return setError('Please enter email and password.');

    setLoading(true);
    const message = await login(email.trim(), password);
    setLoading(false);
    if (message) setError(message);
    else navigate('/dashboard');
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your teacher account">
      {error && <div className="error-msg show" role="alert">{error}</div>}

      {/* A real <form> means pressing Enter submits it */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input id="email" type="email" placeholder="admin@school.com" autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" placeholder="••••••••" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className={`btn-login ${loading ? 'loading' : ''}`}>
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>
      </form>

      <div className="switch-link">
        New teacher? <Link to="/signup">Request an account</Link>
      </div>

      <div className="demo-creds">
        <p>Demo credentials:</p>
        <code>Email: admin@school.com &nbsp;|&nbsp; Password: password</code>
      </div>
    </AuthShell>
  );
}
