// backend/routes/attendance.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, toId, isValidDate } = require('../utils/http');

router.use(verifyToken);

const STATUSES = ['Present', 'Absent'];

// ── POST mark attendance (bulk) ─────────────────────────────
// Body: { subject_id, date: 'YYYY-MM-DD', records: [{ student_id, status }] }
router.post('/mark', asyncHandler(async (req, res) => {
  const { date, records } = req.body;
  const subject_id = toId(req.body.subject_id);
  const teacher_id = req.user.id;

  if (!subject_id || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'Subject, date and at least one student are required.' });
  }
  if (!isValidDate(date)) {
    return res.status(400).json({ success: false, message: 'Date must be a valid date (YYYY-MM-DD).' });
  }
  const bad = records.find(r => !toId(r?.student_id) || !STATUSES.includes(r?.status));
  if (bad) {
    return res.status(400).json({ success: false, message: 'Each record needs a student and a status of Present or Absent.' });
  }

  // INSERT ... ON DUPLICATE KEY UPDATE lets a teacher correct an earlier marking
  const values = records.map(r => [toId(r.student_id), subject_id, teacher_id, date, r.status]);
  await db.query(
    `INSERT INTO attendance (student_id, subject_id, teacher_id, date, status)
     VALUES ?
     ON DUPLICATE KEY UPDATE status = VALUES(status), teacher_id = VALUES(teacher_id)`,
    [values]
  );

  res.json({ success: true, message: `Attendance saved for ${records.length} student(s).` });
}));

// ── GET attendance by date & subject ────────────────────────
router.get('/by-date', asyncHandler(async (req, res) => {
  const { date } = req.query;
  const subject_id = req.query.subject_id ? toId(req.query.subject_id) : null;
  if (date && !isValidDate(date)) {
    return res.status(400).json({ success: false, message: 'Date must be a valid date (YYYY-MM-DD).' });
  }

  let sql = `
    SELECT a.*, s.name AS student_name, s.roll_no, sub.name AS subject_name
    FROM attendance a
    JOIN students s   ON s.id   = a.student_id
    JOIN subjects sub ON sub.id = a.subject_id
    WHERE 1=1
  `;
  const params = [];
  if (date)       { sql += ' AND a.date = ?';       params.push(date); }
  if (subject_id) { sql += ' AND a.subject_id = ?'; params.push(subject_id); }
  sql += ' ORDER BY a.date DESC, s.roll_no';

  const [rows] = await db.query(sql, params);
  res.json({ success: true, data: rows });
}));

// ── GET attendance summary (percentage) ─────────────────────
router.get('/summary', asyncHandler(async (req, res) => {
  const subject_id = req.query.subject_id ? toId(req.query.subject_id) : null;
  const student_id = req.query.student_id ? toId(req.query.student_id) : null;

  let sql = 'SELECT * FROM attendance_summary WHERE 1=1';
  const params = [];
  if (subject_id) { sql += ' AND subject_id = ?'; params.push(subject_id); }
  if (student_id) { sql += ' AND student_id = ?'; params.push(student_id); }
  sql += ' ORDER BY student_name, subject_name';

  const [rows] = await db.query(sql, params);
  res.json({ success: true, data: rows });
}));

// ── GET overall stats for dashboard ─────────────────────────
router.get('/stats', asyncHandler(async (req, res) => {
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
}));

// ── GET student-wise attendance history ─────────────────────
router.get('/student/:id', asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(404).json({ success: false, message: 'Student not found.' });
  const [rows] = await db.query(
    `SELECT a.date, a.status, sub.name AS subject_name, sub.code
     FROM attendance a
     JOIN subjects sub ON sub.id = a.subject_id
     WHERE a.student_id = ?
     ORDER BY a.date DESC`,
    [id]
  );
  res.json({ success: true, data: rows });
}));

// ── DELETE attendance record (admin only) ───────────────────
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const [result] = id ? await db.query('DELETE FROM attendance WHERE id = ?', [id]) : [{ affectedRows: 0 }];
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Record not found.' });
  res.json({ success: true, message: 'Record deleted.' });
}));

module.exports = router;
