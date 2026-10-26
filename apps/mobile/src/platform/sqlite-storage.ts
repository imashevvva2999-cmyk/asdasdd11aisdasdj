import Storage from 'expo-sqlite/kv-store';

import type { KeyValueStorage } from '@mmusic/core/platform/storage';

/** Read once at start-up: if it throws, the device has no working storage. */
const PROBE_KEY = 'mmusic:storage-probe';

/**
 * iOS/Android backend for @mmusic/core's persisted stores: Expo's SQLite
 * key-value store (expo-sqlite/kv-store), whose synchronous calls fit the
 * shared storage contract exactly — stores hydrate before their first render,
 * so saved data is never overwritten by defaults. Same keys and JSON values as
 * the website's localStorage. If SQLite cannot be opened the app runs without
 * persistence (null), and a failing read or write never breaks a screen.
 */
export function sqliteKeyValueStorage(): KeyValueStorage | null {
  try {
    Storage.getItemSync(PROBE_KEY);
  } catch (err) {
    if (__DEV__) console.warn('[mmusic storage] SQLite key-value store unavailable — running without persistence:', err);
    return null;
  }
  return {
    getItem(key) {
      try {
        return Storage.getItemSync(key);
      } catch (err) {
        if (__DEV__) console.warn(`[mmusic storage] read failed: ${key}`, err);
        return null;
      }
    },
    setItem(key, value) {
      try {
        Storage.setItemSync(key, value);
      } catch (err) {
        if (__DEV__) console.warn(`[mmusic storage] write failed: ${key}`, err);
      }
    },
    removeItem(key) {
      try {
        Storage.removeItemSync(key);
      } catch (err) {
        if (__DEV__) console.warn(`[mmusic storage] remove failed: ${key}`, err);
      }
    },
  };
}
