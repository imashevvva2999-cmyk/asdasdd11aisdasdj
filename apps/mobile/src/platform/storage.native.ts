import { enableAppStatePersistence } from '@mmusic/core/platform/app-state-storage';
import { configureStorage, setStorageMisuseListener } from '@mmusic/core/platform/storage';

import { sqliteKeyValueStorage } from './sqlite-storage';

/**
 * iOS/Android counterpart of storage.ts (Metro picks this file there; the
 * website build and the Node checks use storage.ts). Imported for its side
 * effect as the first line of every persisted-store re-export (src/state/*),
 * so storage is configured before any of those stores is created.
 *
 * The backend is Expo's SQLite key-value store (sqlite-storage.ts) — the same
 * keys and values the website keeps in localStorage — or none if it cannot be
 * opened. The native app also keeps the state the website holds in memory
 * only (library, playlists, settings, donation history, notifications), see
 * @mmusic/core/platform/app-state-storage.
 */

// Development only: start-up ordering mistakes (a read or write before this
// runs) are reported as a console warning naming the key — never its value.
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  setStorageMisuseListener((event) => console.warn(`[mmusic storage] ${event.kind}: ${event.key}`));
}

configureStorage(sqliteKeyValueStorage());
enableAppStatePersistence();
