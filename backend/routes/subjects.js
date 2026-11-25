// backend/routes/subjects.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, toId, clean } = require('../utils/http');

router.use(verifyToken);

// GET all
router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM subjects ORDER BY name');
  res.json({ success: true, data: rows });
}));

// POST create
router.post('/', asyncHandler(async (req, res) => {
  const name = clean(req.body.name);
  const code = String(clean(req.body.code) || '').toUpperCase();
  if (!name || !code) return res.status(400).json({ success: false, message: 'Name and Code are required.' });
  if (name.length > 100 || code.length > 20) {
    return res.status(400).json({ success: false, message: 'Name or code is too long.' });
  }
  const [result] = await db.query('INSERT INTO subjects (name, code) VALUES (?, ?)', [name, code]);
  res.status(201).json({ success: true, message: 'Subject added.', id: result.insertId });
}));

// DELETE (admin only: it also deletes all attendance for the subject)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const [result] = id ? await db.query('DELETE FROM subjects WHERE id = ?', [id]) : [{ affectedRows: 0 }];
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Subject not found.' });
  res.json({ success: true, message: 'Subject deleted.' });
}));

module.exports = router;
