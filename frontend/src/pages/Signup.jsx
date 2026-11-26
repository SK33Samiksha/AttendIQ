import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import AuthShell from '../components/AuthShell';

// Teachers request an account here. It stays "pending" until an admin approves it.
export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || !email || !form.password) return setError('Please fill in all fields.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.password2) return setError('The two passwords do not match.');

    setLoading(true);
    const res = await apiFetch('/auth/signup', { method: 'POST', body: { name, email, password: form.password } });
    setLoading(false);
    if (res.success) setSuccess(res.message);
    else setError(res.message || 'Could not send the request.');
  }

  return (
    <AuthShell title="Request an account"
      subtitle="For teachers. An admin will approve your request before you can sign in.">
      {error && <div className="error-msg show" role="alert">{error}</div>}

      {success ? (
        <div className="success-msg show">{success}</div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input id="name" placeholder="e.g. Prof. Anjali Nair" autoComplete="name"
              value={form.name} onChange={update('name')} />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" placeholder="you@school.com" autoComplete="email"
              value={form.email} onChange={update('email')} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password (at least 8 characters)</label>
            <input id="password" type="password" autoComplete="new-password"
              value={form.password} onChange={update('password')} />
          </div>
          <div className="form-group">
            <label htmlFor="password2">Confirm Password</label>
            <input id="password2" type="password" autoComplete="new-password"
              value={form.password2} onChange={update('password2')} />
          </div>
          <button type="submit" className={`btn-login ${loading ? 'loading' : ''}`}>
            {loading ? 'Sending…' : 'Send Request →'}
          </button>
        </form>
      )}

      <div className="switch-link">
        Already have an account? <Link to="/">Sign in</Link>
      </div>
    </AuthShell>
  );
}
