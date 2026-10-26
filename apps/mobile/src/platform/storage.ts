import { configureStorage, setStorageMisuseListener } from '@mmusic/core/platform/storage';

import { browserLocalStorage } from './browser-storage';

/**
 * Chooses the backend for @mmusic/core's persisted stores (W2.4b group 6.3).
 * Imported for its side effect as the first line of every persisted-store
 * re-export (src/state/*), so storage is configured before any of those stores
 * is created and long before the root layout's client-only rehydrate effects.
 *
 * The browser's localStorage on web; no storage (a no-op) during static
 * rendering, in Node checks and when the browser blocks site data. iOS and
 * Android use storage.native.ts instead (Expo's SQLite key-value store).
 */

// Development only: start-up ordering mistakes (a read or write before this
// runs) are reported as a console warning naming the key — never its value.
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  setStorageMisuseListener((event) => console.warn(`[mmusic storage] ${event.kind}: ${event.key}`));
}

configureStorage(browserLocalStorage());
