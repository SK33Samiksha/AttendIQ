// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const db  = require('../config/db');

// Checks the "Authorization: Bearer <token>" header, then looks the user up so
// that a disabled account is locked out immediately (not only when its token expires).
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Please sign in first.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
  }

  try {
    const [rows] = await db.query('SELECT id, name, email, role, status FROM users WHERE id = ?', [payload.id]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'This account no longer exists.' });
    }
    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Your account is not active. Please contact the admin.' });
    }
    req.user = user; // role always comes from the database, not from the token
    next();
  } catch (err) {
    next(err);
  }
};

// Only admins may continue
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only an admin can do this.' });
  }
  next();
};

module.exports = verifyToken;
module.exports.verifyToken = verifyToken;
module.exports.requireAdmin = requireAdmin;
