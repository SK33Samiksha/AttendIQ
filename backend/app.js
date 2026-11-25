// backend/app.js — the Express app (started by server.js, also used by the tests)
const express   = require('express');
const path      = require('path');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(express.json({ limit: '1mb' }));

// The frontend is served by this same server, so no CORS setup is needed.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Slow down password guessing and sign-up spam: 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/subjects',   require('./routes/subjects'));
app.use('/api/attendance', require('./routes/attendance'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AttendIQ API is running.' });
});

// Unknown API paths get a JSON 404 (not the login page)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Not found.' });
});

// Anything else falls back to the login page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Error handler ─────────────────────────────────────────────
// Database errors are logged on the server; users get a short, safe message.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid request body.' });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    const msg = /roll_no/.test(err.message) ? 'This Roll No already exists.'
      : /code/.test(err.message) ? 'This subject code already exists.'
      : /email/.test(err.message) ? 'This email is already registered.'
      : 'This entry already exists.';
    return res.status(409).json({ success: false, message: msg });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(400).json({ success: false, message: 'The selected student or subject does not exist.' });
  }
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Something went wrong on the server.' });
});

module.exports = app;
