// backend/config/migrate.js
// Brings an existing database up to date when the server starts, so people who
// already ran an older database.sql don't have to drop their data.
const pool = require('./db');

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].n > 0;
}

async function migrate() {
  // v2: account status for teacher sign-up with admin approval
  if (!(await columnExists('users', 'status'))) {
    await pool.query(
      "ALTER TABLE users ADD COLUMN status ENUM('pending','active','disabled') NOT NULL DEFAULT 'active' AFTER role"
    );
    console.log('🛠  Database updated: added users.status (existing accounts stay active)');
  }
}

module.exports = migrate;
