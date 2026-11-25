// backend/utils/http.js — small helpers shared by the routes

// Express 4 does not catch errors thrown in async route handlers;
// this passes them on to the error handler in app.js instead of crashing.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// An error with an HTTP status and a message that is safe to show to the user
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Positive whole number from a route param / body value, or null
const toId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Valid calendar date in YYYY-MM-DD format
const isValidDate = (s) => {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const clean = (v) => (typeof v === 'string' ? v.trim() : v);

module.exports = { asyncHandler, HttpError, EMAIL_RE, toId, isValidDate, clean };
