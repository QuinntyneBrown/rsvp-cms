import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' }, fs: { allow: ['../..'] } },
  build: { outDir: '../../dist/admin', emptyOutDir: true },
});
