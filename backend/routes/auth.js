// backend/routes/auth.js
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler, EMAIL_RE, clean } = require('../utils/http');

const MIN_PASSWORD = 8;

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];

  // Same message whether the email or the password is wrong
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  if (user.status === 'pending') {
    return res.status(403).json({ success: false, message: 'Your account is waiting for admin approval. Please try again later.' });
  }
  if (user.status === 'disabled') {
    return res.status(403).json({ success: false, message: 'Your account has been disabled. Please contact the admin.' });
  }

  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    success: true,
    message: 'Login successful.',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}));

// ── POST /api/auth/signup — a teacher requests an account ────
// The account starts as 'pending' and can only sign in after an admin approves it.
// The role is always 'teacher'; admins can only be made by another admin.
router.post('/signup', asyncHandler(async (req, res) => {
  const name = clean(req.body.name);
  const email = String(clean(req.body.email) || '').toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }
  if (name.length > 100) {
    return res.status(400).json({ success: false, message: 'Name is too long.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ success: false, message: `Password must be at least ${MIN_PASSWORD} characters.` });
  }

  const [existing] = await db.query('SELECT status FROM users WHERE email = ?', [email]);
  if (existing.length) {
    const msg = existing[0].status === 'pending'
      ? 'A request with this email is already waiting for approval.'
      : 'This email is already registered. Please sign in instead.';
    return res.status(409).json({ success: false, message: msg });
  }

  const hash = await bcrypt.hash(password, 10);
  await db.query(
    "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'teacher', 'pending')",
    [name, email, hash]
  );
  res.status(201).json({
    success: true,
    message: 'Request sent! You can sign in once an admin approves your account.',
  });
}));

// ── POST /api/auth/change-password — signed-in user changes their own password ──
router.post('/change-password', verifyToken, asyncHandler(async (req, res) => {
  const current = String(req.body.currentPassword || '');
  const next = String(req.body.newPassword || '');

  if (!current || !next) {
    return res.status(400).json({ success: false, message: 'Please enter your current and new password.' });
  }
  if (next.length < MIN_PASSWORD) {
    return res.status(400).json({ success: false, message: `New password must be at least ${MIN_PASSWORD} characters.` });
  }

  const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(current, rows[0].password))) {
    return res.status(400).json({ success: false, message: 'Your current password is not correct.' });
  }
  if (current === next) {
    return res.status(400).json({ success: false, message: 'The new password must be different from the current one.' });
  }

  await db.query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(next, 10), req.user.id]);
  res.json({ success: true, message: 'Password changed.' });
}));

module.exports = router;
