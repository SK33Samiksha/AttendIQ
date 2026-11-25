// backend/routes/users.js — staff accounts (admin only)
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, EMAIL_RE, toId, clean } = require('../utils/http');

router.use(verifyToken, requireAdmin);

// Loads a user by :id, or sends 404 and returns null
async function findUser(req, res) {
  const id = toId(req.params.id);
  const [rows] = id ? await db.query('SELECT id, name, role, status FROM users WHERE id = ?', [id]) : [[]];
  if (!rows.length) {
    res.status(404).json({ success: false, message: 'Account not found.' });
    return null;
  }
  return rows[0];
}

// ── GET /api/users — pending requests first ──────────────────
router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, email, role, status, created_at FROM users
     ORDER BY FIELD(status, 'pending', 'active', 'disabled'), role, name`
  );
  res.json({ success: true, data: rows });
}));

// ── GET /api/users/pending-count — for the sidebar badge ─────
router.get('/pending-count', asyncHandler(async (req, res) => {
  const [[{ n }]] = await db.query("SELECT COUNT(*) AS n FROM users WHERE status = 'pending'");
  res.json({ success: true, data: { pending: n } });
}));

// ── POST /api/users — admin adds a teacher or admin directly (active) ──
router.post('/', asyncHandler(async (req, res) => {
  const name = clean(req.body.name);
  const email = String(clean(req.body.email) || '').toLowerCase();
  const password = String(req.body.password || '');
  const role = req.body.role === 'admin' ? 'admin' : 'teacher';

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) {
    return res.status(409).json({ success: false, message: 'This email is already registered.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.query(
    "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, 'active')",
    [name, email, hash, role]
  );
  res.status(201).json({ success: true, message: `${role === 'admin' ? 'Admin' : 'Teacher'} account created.`, id: result.insertId });
}));

// ── PATCH /api/users/:id/status — approve, disable or re-enable ──
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const status = req.body.status;
  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ success: false, message: "Status must be 'active' or 'disabled'." });
  }
  const user = await findUser(req, res);
  if (!user) return;
  if (user.id === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot change the status of your own account.' });
  }

  await db.query('UPDATE users SET status = ? WHERE id = ?', [status, user.id]);
  const msg = status === 'disabled' ? `${user.name}'s account was disabled.`
    : user.status === 'pending' ? `${user.name} was approved and can now sign in.`
    : `${user.name}'s account was enabled again.`;
  res.json({ success: true, message: msg });
}));

// ── POST /api/users/:id/reset-password — admin sets a new password ──
router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const password = String(req.body.password || '');
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }
  const user = await findUser(req, res);
  if (!user) return;

  await db.query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(password, 10), user.id]);
  res.json({ success: true, message: `Password reset for ${user.name}. Give them the new password.` });
}));

// ── DELETE /api/users/:id — reject a pending request ─────────
// Active accounts are disabled instead of deleted, because deleting a teacher
// would also delete every attendance record they marked.
router.delete('/:id', asyncHandler(async (req, res) => {
  const user = await findUser(req, res);
  if (!user) return;
  if (user.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Only pending requests can be deleted. Disable the account instead, so their attendance records are kept.',
    });
  }
  await db.query('DELETE FROM users WHERE id = ?', [user.id]);
  res.json({ success: true, message: `${user.name}'s request was rejected.` });
}));

module.exports = router;
