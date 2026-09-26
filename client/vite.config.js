import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// In development the API and Socket.IO are proxied to the Express server, so the browser
// talks to one origin and the httpOnly login cookie just works.
// Set VITE_API_TARGET in client/.env.local if your server runs on another port.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_TARGET || 'http://localhost:5000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true },
      },
    },
    preview: {
      proxy: {
        '/api': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true },
      },
    },
  };
});
