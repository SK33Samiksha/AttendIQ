// backend/routes/students.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, EMAIL_RE, toId, clean } = require('../utils/http');

router.use(verifyToken);

// Checks the form fields; returns an error message or null
function validate({ name, roll_no, email }) {
  if (!name || !roll_no) return 'Name and Roll No are required.';
  if (name.length > 100) return 'Name is too long (max 100 characters).';
  if (roll_no.length > 20) return 'Roll No is too long (max 20 characters).';
  if (email && !EMAIL_RE.test(email)) return 'Please enter a valid email address.';
  return null;
}

const readBody = (b) => ({
  name: clean(b.name),
  roll_no: clean(String(b.roll_no ?? '')),
  email: clean(b.email) || null,
  cls: clean(b.class) || null,
});

// ── GET all students ─────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM students ORDER BY roll_no');
  res.json({ success: true, data: rows });
}));

// ── GET single student ───────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const [rows] = id ? await db.query('SELECT * FROM students WHERE id = ?', [id]) : [[]];
  if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found.' });
  res.json({ success: true, data: rows[0] });
}));

// ── POST create student ──────────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const s = readBody(req.body);
  const problem = validate(s);
  if (problem) return res.status(400).json({ success: false, message: problem });

  const [result] = await db.query(
    'INSERT INTO students (name, roll_no, email, class) VALUES (?, ?, ?, ?)',
    [s.name, s.roll_no, s.email, s.cls]
  );
  res.status(201).json({ success: true, message: 'Student added.', id: result.insertId });
}));

// ── PUT update student ───────────────────────────────────────
router.put('/:id', asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const s = readBody(req.body);
  const problem = validate(s);
  if (problem) return res.status(400).json({ success: false, message: problem });

  const [result] = id
    ? await db.query('UPDATE students SET name=?, roll_no=?, email=?, class=? WHERE id=?',
        [s.name, s.roll_no, s.email, s.cls, id])
    : [{ affectedRows: 0 }];
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Student not found.' });
  res.json({ success: true, message: 'Student updated.' });
}));

// ── DELETE student (admin only: it also deletes their attendance) ──
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const [result] = id ? await db.query('DELETE FROM students WHERE id = ?', [id]) : [{ affectedRows: 0 }];
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Student not found.' });
  res.json({ success: true, message: 'Student deleted.' });
}));

module.exports = router;
