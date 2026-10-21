import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Fixed ports with strictPort (approved 2026-10-21): CRM 5184/5185 — never the website (5180/5181), ARM (5182/5183)
// or the mobile app (8081). CRM uses no @mmusic/core catalog data, so no __DEV__ gate is needed.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '127.0.0.1', port: 5184, strictPort: true },
  preview: { host: '127.0.0.1', port: 5185, strictPort: true },
});
