// backend/routes/attendance.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const auth    = require('../middleware/auth');

// ── POST mark attendance (bulk) ─────────────────────────────
// Body: { subject_id, date, records: [{ student_id, status }] }
router.post('/mark', auth, async (req, res) => {
  try {
    const { subject_id, date, records } = req.body;
    const teacher_id = req.user.id;

    if (!subject_id || !date || !records || records.length === 0) {
      return res.status(400).json({ success: false, message: 'subject_id, date and records are required.' });
    }

    // Use INSERT ... ON DUPLICATE KEY UPDATE to handle re-marking
    const values = records.map(r => [r.student_id, subject_id, teacher_id, date, r.status]);
    await db.query(
      `INSERT INTO attendance (student_id, subject_id, teacher_id, date, status)
       VALUES ? 
       ON DUPLICATE KEY UPDATE status = VALUES(status), teacher_id = VALUES(teacher_id)`,
      [values]
    );

    res.json({ success: true, message: `Attendance marked for ${records.length} student(s).` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET attendance by date & subject ────────────────────────
router.get('/by-date', auth, async (req, res) => {
  try {
    const { date, subject_id } = req.query;
    let sql = `
      SELECT a.*, s.name AS student_name, s.roll_no, sub.name AS subject_name
      FROM attendance a
      JOIN students s  ON s.id  = a.student_id
      JOIN subjects sub ON sub.id = a.subject_id
      WHERE 1=1
    `;
    const params = [];
    if (date)       { sql += ' AND a.date = ?';       params.push(date); }
    if (subject_id) { sql += ' AND a.subject_id = ?'; params.push(subject_id); }
    sql += ' ORDER BY a.date DESC, s.roll_no';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET attendance summary (percentage) ─────────────────────
router.get('/summary', auth, async (req, res) => {
  try {
    const { subject_id, student_id } = req.query;
    let sql = 'SELECT * FROM attendance_summary WHERE 1=1';
    const params = [];
    if (subject_id) { sql += ' AND subject_id = ?';  params.push(subject_id); }
    if (student_id) { sql += ' AND student_id = ?';  params.push(student_id); }
    sql += ' ORDER BY student_name, subject_name';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET overall stats for dashboard ─────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const [[{ total_students }]] = await db.query('SELECT COUNT(*) AS total_students FROM students');
    const [[{ total_subjects }]] = await db.query('SELECT COUNT(*) AS total_subjects FROM subjects');
    const [[{ total_records  }]] = await db.query('SELECT COUNT(*) AS total_records  FROM attendance');
    const [[{ present_today  }]] = await db.query(
      "SELECT COUNT(*) AS present_today FROM attendance WHERE date = CURDATE() AND status = 'Present'"
    );
    const [[{ avg_percentage }]] = await db.query(
      'SELECT ROUND(AVG(percentage),1) AS avg_percentage FROM attendance_summary'
    );

    res.json({
      success: true,
      data: { total_students, total_subjects, total_records, present_today, avg_percentage: avg_percentage || 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET student-wise attendance history ─────────────────────
router.get('/student/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.date, a.status, sub.name AS subject_name, sub.code
       FROM attendance a
       JOIN subjects sub ON sub.id = a.subject_id
       WHERE a.student_id = ?
       ORDER BY a.date DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE attendance record ─────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM attendance WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Record deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
