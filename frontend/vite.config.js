import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3002',
      '/files': 'http://localhost:3002',
    },
  },
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
  },
});
