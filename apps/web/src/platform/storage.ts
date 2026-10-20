import { configureStorage, setStorageMisuseListener } from '@mmusic/core/platform/storage';

import { browserLocalStorage } from './browser-storage';

/**
 * Chooses the backend for @mmusic/core's persisted stores (W2.4c-1): the
 * browser's localStorage, or no storage when the browser blocks it. Imported
 * for its side effect as the FIRST import of src/main.tsx — and of any module
 * that imports a persisted core store — so storage is configured once, at
 * module evaluation, before any persisted store is created or hydrated. React
 * StrictMode re-runs renders and effects, never module evaluation.
 *
 * Same keys and values as the Expo app: core passes them through untouched.
 */

// Development only: start-up ordering mistakes (a read or write before this
// runs) are reported as a console warning naming the key — never its value.
if (import.meta.env.DEV) {
  setStorageMisuseListener((event) => console.warn(`[mmusic storage] ${event.kind}: ${event.key}`));
}

configureStorage(browserLocalStorage());
