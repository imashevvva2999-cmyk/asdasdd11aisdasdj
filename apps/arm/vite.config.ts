import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Fixed ports with strictPort (approved 2026-10-21): ARM 5182/5183 — never the website (5180/5181), CRM (5184/5185)
// or the mobile app (8081).
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // @mmusic/core gates development-only catalog content (Ошондо) behind `typeof __DEV__ !== 'undefined' && __DEV__`:
  // true on the dev server, false in builds so the minifier removes it (verified by verify:dist).
  define: { __DEV__: command === 'serve' ? 'true' : 'false' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '127.0.0.1', port: 5182, strictPort: true },
  preview: { host: '127.0.0.1', port: 5183, strictPort: true },
}));
