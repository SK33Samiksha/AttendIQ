// API tests. They run against a real MySQL database called attendance_test,
// which is created fresh from database.sql every time.
//
// Run with:  npm test   (uses DB_HOST / DB_USER / DB_PASSWORD from .env or the environment)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DB_NAME = 'attendance_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.LOGIN_RATE_LIMIT = '1000';

const mysql = require('mysql2/promise');

let server, base, db;
const tokens = {};

async function createTestDatabase() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'database.sql'), 'utf8')
    .replaceAll('attendance_db', 'attendance_test');
  await conn.query('DROP DATABASE IF EXISTS attendance_test');
  await conn.query(schema);
  await conn.end();
}

async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  await createTestDatabase();
  db = require('../config/db');
  const app = require('../app');
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await db?.end();
});

test('login: wrong password is rejected, right one gives a token', async () => {
  const wrong = await call('POST', '/api/auth/login', { email: 'admin@school.com', password: 'nope' });
  assert.equal(wrong.status, 401);

  const admin = await call('POST', '/api/auth/login', { email: 'admin@school.com', password: 'password' });
  assert.equal(admin.status, 200);
  assert.equal(admin.body.user.role, 'admin');
  assert.ok(!JSON.stringify(admin.body).includes('$2b$'), 'password hash is never sent');
  tokens.admin = admin.body.token;

  const teacher = await call('POST', '/api/auth/login', { email: 'SHARMA@school.com', password: 'password' });
  assert.equal(teacher.status, 200, 'email is case-insensitive');
  tokens.teacher = teacher.body.token;
});

test('everything except login needs a valid token', async () => {
  assert.equal((await call('GET', '/api/students')).status, 401);
  assert.equal((await call('GET', '/api/students', null, 'garbage')).status, 401);
});

test('admin can add staff directly; teachers cannot', async () => {
  assert.equal((await call('POST', '/api/auth/register', { name: 'x', email: 'x@x.com', password: 'longpassword', role: 'admin' })).status, 404,
    'the old public register endpoint is gone');

  const asTeacher = await call('POST', '/api/users', { name: 'X', email: 'x@x.com', password: 'longpassword' }, tokens.teacher);
  assert.equal(asTeacher.status, 403);

  assert.equal((await call('POST', '/api/users', { name: 'X', email: 'bad', password: 'longpassword' }, tokens.admin)).status, 400);
  assert.equal((await call('POST', '/api/users', { name: 'X', email: 'x@x.com', password: 'short' }, tokens.admin)).status, 400);

  const ok = await call('POST', '/api/users', { name: 'Prof. Rao', email: 'rao@school.com', password: 'longpassword' }, tokens.admin);
  assert.equal(ok.status, 201);
  assert.equal((await call('POST', '/api/users', { name: 'Rao 2', email: 'RAO@school.com', password: 'longpassword' }, tokens.admin)).status, 409);

  const login = await call('POST', '/api/auth/login', { email: 'rao@school.com', password: 'longpassword' });
  assert.equal(login.body.user.role, 'teacher');
});

test('teacher sign-up: pending until an admin approves, never admin', async () => {
  assert.equal((await call('POST', '/api/auth/signup', { name: 'N', email: 'nope', password: 'longpassword' })).status, 400);
  assert.equal((await call('POST', '/api/auth/signup', { name: 'N', email: 'n@school.com', password: 'short' })).status, 400);

  const req = await call('POST', '/api/auth/signup', { name: 'Prof. Nair', email: 'nair@school.com', password: 'nairpass1', role: 'admin' });
  assert.equal(req.status, 201);
  assert.ok(!('token' in req.body), 'no token before approval');

  const again = await call('POST', '/api/auth/signup', { name: 'Prof. Nair', email: 'nair@school.com', password: 'nairpass1' });
  assert.equal(again.status, 409);
  assert.match(again.body.message, /waiting for approval/);
  assert.equal((await call('POST', '/api/auth/signup', { name: 'X', email: 'admin@school.com', password: 'longpassword' })).status, 409);

  const early = await call('POST', '/api/auth/login', { email: 'nair@school.com', password: 'nairpass1' });
  assert.equal(early.status, 403);
  assert.match(early.body.message, /waiting for admin approval/);

  const pending = await call('GET', '/api/users/pending-count', null, tokens.admin);
  assert.equal(pending.body.data.pending, 1);

  const list = await call('GET', '/api/users', null, tokens.admin);
  const nair = list.body.data[0];
  assert.equal(nair.email, 'nair@school.com', 'pending requests are listed first');
  assert.equal(nair.status, 'pending');
  assert.equal(nair.role, 'teacher', 'role sent in the sign-up form is ignored');

  assert.equal((await call('PATCH', `/api/users/${nair.id}/status`, { status: 'active' }, tokens.teacher)).status, 403);
  assert.equal((await call('PATCH', `/api/users/${nair.id}/status`, { status: 'active' }, tokens.admin)).status, 200);

  const login = await call('POST', '/api/auth/login', { email: 'nair@school.com', password: 'nairpass1' });
  assert.equal(login.status, 200);
  tokens.nair = login.body.token;
  tokens.nairId = nair.id;
});

test('rejecting a request, and why active accounts are disabled instead of deleted', async () => {
  await call('POST', '/api/auth/signup', { name: 'Spam Bot', email: 'spam@x.com', password: 'spampass1' });
  const spam = (await call('GET', '/api/users', null, tokens.admin)).body.data.find((u) => u.email === 'spam@x.com');
  assert.equal((await call('DELETE', `/api/users/${spam.id}`, null, tokens.admin)).status, 200);
  assert.equal((await call('POST', '/api/auth/login', { email: 'spam@x.com', password: 'spampass1' })).status, 401);

  const del = await call('DELETE', `/api/users/${tokens.nairId}`, null, tokens.admin);
  assert.equal(del.status, 400, 'active teachers cannot be deleted');
});

test('disabling a teacher locks them out straight away; enabling lets them back', async () => {
  assert.equal((await call('GET', '/api/students', null, tokens.nair)).status, 200);
  assert.equal((await call('PATCH', `/api/users/${tokens.nairId}/status`, { status: 'disabled' }, tokens.admin)).status, 200);

  assert.equal((await call('GET', '/api/students', null, tokens.nair)).status, 401, 'old token stops working');
  const login = await call('POST', '/api/auth/login', { email: 'nair@school.com', password: 'nairpass1' });
  assert.equal(login.status, 403);
  assert.match(login.body.message, /disabled/);

  assert.equal((await call('PATCH', `/api/users/${tokens.nairId}/status`, { status: 'active' }, tokens.admin)).status, 200);
  assert.equal((await call('POST', '/api/auth/login', { email: 'nair@school.com', password: 'nairpass1' })).status, 200);

  const adminId = (await call('GET', '/api/users', null, tokens.admin)).body.data.find((u) => u.email === 'admin@school.com').id;
  assert.equal((await call('PATCH', `/api/users/${adminId}/status`, { status: 'disabled' }, tokens.admin)).status, 400,
    'an admin cannot lock themselves out');
});

test('changing your own password, and admin password reset', async () => {
  const wrong = await call('POST', '/api/auth/change-password', { currentPassword: 'nope', newPassword: 'newpass123' }, tokens.nair);
  assert.equal(wrong.status, 400);
  assert.equal((await call('POST', '/api/auth/change-password', { currentPassword: 'nairpass1', newPassword: 'short' }, tokens.nair)).status, 400);
  assert.equal((await call('POST', '/api/auth/change-password', { currentPassword: 'nairpass1', newPassword: 'newpass123' }, tokens.nair)).status, 200);
  assert.equal((await call('POST', '/api/auth/login', { email: 'nair@school.com', password: 'nairpass1' })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { email: 'nair@school.com', password: 'newpass123' })).status, 200);

  assert.equal((await call('POST', `/api/users/${tokens.nairId}/reset-password`, { password: 'reset1234' }, tokens.teacher)).status, 403);
  assert.equal((await call('POST', `/api/users/${tokens.nairId}/reset-password`, { password: 'reset1234' }, tokens.admin)).status, 200);
  assert.equal((await call('POST', '/api/auth/login', { email: 'nair@school.com', password: 'reset1234' })).status, 200);
});

test('an older database without the status column is updated automatically', async () => {
  await db.query('ALTER TABLE users DROP COLUMN status');
  await require('../config/migrate')();
  const [[row]] = await db.query("SELECT status FROM users WHERE email = 'admin@school.com'");
  assert.equal(row.status, 'active', 'existing accounts stay active');
  await require('../config/migrate')(); // running it again changes nothing
});

test('students: add, validate, update and admin-only delete', async () => {
  const add = await call('POST', '/api/students', { name: "Anita D'Souza", roll_no: '201', class: 'MCA-1' }, tokens.teacher);
  assert.equal(add.status, 201);
  const id = add.body.id;

  const dup = await call('POST', '/api/students', { name: 'Someone', roll_no: '201' }, tokens.teacher);
  assert.equal(dup.status, 409);
  assert.equal(dup.body.message, 'This Roll No already exists.');
  assert.ok(!/Duplicate entry/.test(dup.body.message), 'no raw SQL error is shown');

  assert.equal((await call('POST', '/api/students', { name: 'A', roll_no: '202', email: 'not-an-email' }, tokens.teacher)).status, 400);
  assert.equal((await call('PUT', '/api/students/999999', { name: 'A', roll_no: '999' }, tokens.teacher)).status, 404);
  assert.equal((await call('PUT', `/api/students/${id}`, { name: 'Anita DSouza', roll_no: '201' }, tokens.teacher)).status, 200);

  assert.equal((await call('DELETE', `/api/students/${id}`, null, tokens.teacher)).status, 403);
  assert.equal((await call('DELETE', `/api/students/${id}`, null, tokens.admin)).status, 200);
  assert.equal((await call('DELETE', `/api/students/${id}`, null, tokens.admin)).status, 404);
});

test('subjects: duplicate codes and admin-only delete', async () => {
  const add = await call('POST', '/api/subjects', { name: 'Machine Learning', code: 'ml' }, tokens.teacher);
  assert.equal(add.status, 201);
  const dup = await call('POST', '/api/subjects', { name: 'ML again', code: 'ML' }, tokens.teacher);
  assert.equal(dup.status, 409);
  assert.equal((await call('DELETE', `/api/subjects/${add.body.id}`, null, tokens.teacher)).status, 403);
  assert.equal((await call('DELETE', `/api/subjects/${add.body.id}`, null, tokens.admin)).status, 200);
});

test('marking attendance validates input and can be corrected', async () => {
  const bad = [
    { subject_id: 1, date: '2024-02-30', records: [{ student_id: 1, status: 'Present' }] },
    { subject_id: 1, date: '15-01-2024', records: [{ student_id: 1, status: 'Present' }] },
    { subject_id: 1, date: '2024-02-01', records: [{ student_id: 1, status: 'Late' }] },
    { subject_id: 1, date: '2024-02-01', records: [] },
  ];
  for (const body of bad) {
    assert.equal((await call('POST', '/api/attendance/mark', body, tokens.teacher)).status, 400, JSON.stringify(body));
  }
  const missing = await call('POST', '/api/attendance/mark',
    { subject_id: 1, date: '2024-02-01', records: [{ student_id: 99999, status: 'Present' }] }, tokens.teacher);
  assert.equal(missing.status, 400);
  assert.match(missing.body.message, /does not exist/);

  const records = [1, 2, 3, 4, 5].map((id) => ({ student_id: id, status: 'Present' }));
  assert.equal((await call('POST', '/api/attendance/mark', { subject_id: 3, date: '2024-02-01', records }, tokens.teacher)).status, 200);

  // correct one student to Absent
  records[0].status = 'Absent';
  assert.equal((await call('POST', '/api/attendance/mark', { subject_id: 3, date: '2024-02-01', records }, tokens.teacher)).status, 200);

  const day = await call('GET', '/api/attendance/by-date?date=2024-02-01&subject_id=3', null, tokens.teacher);
  assert.equal(day.body.data.length, 5, 'no duplicate rows after re-marking');
  assert.equal(day.body.data.find((r) => r.student_id === 1).status, 'Absent');
});

test('dates come back exactly as stored (regression: "Invalid Date" bug)', async () => {
  const res = await call('GET', '/api/attendance/by-date?date=2024-01-15&subject_id=1', null, tokens.teacher);
  assert.ok(res.body.data.length > 0);
  for (const row of res.body.data) assert.equal(row.date, '2024-01-15');
});

test('summary percentages are calculated correctly', async () => {
  const res = await call('GET', '/api/attendance/summary?subject_id=1&student_id=1', null, tokens.teacher);
  const row = res.body.data[0];
  assert.equal(row.total_classes, 3);
  assert.equal(Number(row.present_count), 2);
  assert.equal(Number(row.percentage), 66.67);
});

test('unknown API paths return JSON 404', async () => {
  const res = await call('GET', '/api/nothing-here', null, tokens.teacher);
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});
