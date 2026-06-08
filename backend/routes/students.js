// backend/routes/students.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const auth    = require('../middleware/auth');

// ── GET all students ─────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM students ORDER BY roll_no');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET single student ───────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST create student ──────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, roll_no, email, class: cls } = req.body;
    if (!name || !roll_no) return res.status(400).json({ success: false, message: 'Name and Roll No are required.' });

    const [result] = await db.query(
      'INSERT INTO students (name, roll_no, email, class) VALUES (?, ?, ?, ?)',
      [name, roll_no, email || null, cls || null]
    );
    res.status(201).json({ success: true, message: 'Student added.', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Roll No already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT update student ───────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, roll_no, email, class: cls } = req.body;
    await db.query(
      'UPDATE students SET name=?, roll_no=?, email=?, class=? WHERE id=?',
      [name, roll_no, email, cls, req.params.id]
    );
    res.json({ success: true, message: 'Student updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE student ───────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Student deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
