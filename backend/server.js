// backend/server.js — checks the settings, connects to MySQL and starts the app
require('dotenv').config();

// Stop early with a clear message instead of failing on the first login
const missing = ['DB_PASSWORD', 'JWT_SECRET'].filter((k) => process.env[k] === undefined || process.env[k] === '');
if (missing.includes('JWT_SECRET')) {
  console.error('❌ JWT_SECRET is not set. Copy backend/.env.example to backend/.env and fill it in.');
  process.exit(1);
}
if (missing.includes('DB_PASSWORD')) {
  console.warn('⚠️  DB_PASSWORD is empty. That only works if your MySQL user has no password.');
}

const app = require('./app');
const { checkConnection } = require('./config/db');
const migrate = require('./config/migrate');

const PORT = Number(process.env.PORT) || 5000;

checkConnection()
  .then(migrate)
  .then(() => {
    console.log('✅ MySQL connected successfully');
    const server = app.listen(PORT, () => {
      console.log(`🚀 AttendIQ running at http://localhost:${PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use (another app is running on it).`);
        console.error('   Stop that app, or set a different PORT in backend/.env, e.g. PORT=5001');
        process.exit(1);
      }
      throw err;
    });
  })
  .catch((err) => {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   Check DB_HOST, DB_USER, DB_PASSWORD and DB_NAME in backend/.env, and that database.sql has been run.');
    process.exit(1);
  });
