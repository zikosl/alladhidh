import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';
const appRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: appRoot,
  publicDir: 'public',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  }
});
