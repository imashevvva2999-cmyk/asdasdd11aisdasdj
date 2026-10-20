import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Fixed ports with strictPort: never drift onto Mmusic mobile (:8081) or the design prototypes (:9422).
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // @mmusic/core gates development-only content (Ошондо) behind `typeof __DEV__ !== 'undefined' && __DEV__`.
  // true on the dev server; false in production builds — not merely undefined, so the minifier removes the gated
  // data (names, keys) from the bundle instead of shipping it switched off.
  define: { __DEV__: command === 'serve' ? 'true' : 'false' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
  preview: { host: '127.0.0.1', port: 5181, strictPort: true },
}));
