import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  server: { port: 5174, proxy: { '/api': 'http://localhost:3000' }, fs: { allow: ['../..'] } },
  appType: 'spa', // /i/<token> personal links fall back to index.html
  build: { outDir: '../../dist/rsvp', emptyOutDir: true },
});
