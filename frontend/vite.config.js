import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

// While developing (npm run dev), Vite serves the React app on port 5173 and forwards
// every /api request to the Express backend. The backend's port is read from
// backend/.env so it works whether you use PORT=5000 or PORT=5001.
function backendPort() {
  try {
    const env = fs.readFileSync(new URL('../backend/.env', import.meta.url), 'utf8');
    const match = env.match(/^\s*PORT\s*=\s*(\d+)/m);
    if (match) return match[1];
  } catch { /* no .env yet: use the default */ }
  return '5000';
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${backendPort()}`,
    },
  },
});
