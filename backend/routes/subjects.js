// backend/routes/subjects.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const auth    = require('../middleware/auth');

// GET all
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM subjects ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create
router.post('/', auth, async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, message: 'Name and Code required.' });
    const [result] = await db.query('INSERT INTO subjects (name, code) VALUES (?, ?)', [name, code]);
    res.status(201).json({ success: true, message: 'Subject added.', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Subject code already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Subject deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
