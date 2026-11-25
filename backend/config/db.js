// backend/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'attendance_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Return DATE columns as plain 'YYYY-MM-DD' strings. Without this, mysql2
  // turns them into JavaScript Date objects, which get shifted to UTC when sent
  // to the browser ('2024-01-15' arrived as '2024-01-14T18:30:00.000Z' in India)
  // and the Records page showed "Invalid Date".
  dateStrings: true,
});

// Called once from server.js when the app starts
async function checkConnection() {
  const conn = await pool.getConnection();
  conn.release();
}

module.exports = pool;
module.exports.checkConnection = checkConnection;
