import { platformStorage, type KeyValueStorage } from './storage';

/**
 * Storage for app state the website keeps in memory only — the listener's
 * library, playlists, audio settings, donation history and notifications. The
 * iOS/Android app enables it at start-up (apps/mobile/src/platform/storage.ts)
 * and so keeps that state across launches. Until an app enables it, reads
 * return null and writes are dropped: on the website these stores never touch
 * storage (no new keys, behaviour unchanged).
 *
 * Stores use it like `platformStorage`: `createJSONStorage(() => appStateStorage)`,
 * `skipHydration: true`, and the app rehydrates them once storage is set up.
 */
let enabled = false;
/** Keys read back this session. A key is never written before that: until its
 * store hydrates, its state is only defaults (e.g. a store's own set-up at
 * module load), which must not overwrite saved data. Hydration reads first. */
const readKeys = new Set<string>();

export function enableAppStatePersistence(): void {
  enabled = true;
}

export function appStatePersistenceEnabled(): boolean {
  return enabled;
}

export const appStateStorage: KeyValueStorage = {
  getItem: (key) => {
    if (!enabled) return null;
    readKeys.add(key);
    return platformStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (enabled && readKeys.has(key)) platformStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (enabled && readKeys.has(key)) platformStorage.removeItem(key);
  },
};

/** Test hook: back to disabled, nothing read yet. */
export function resetAppStatePersistenceForTests(): void {
  enabled = false;
  readKeys.clear();
}

/** For `merge`: persisted value of `key` if it passes `valid`, otherwise the current one (corrupted data is ignored). */
export function persistedOr<T>(persisted: unknown, key: string, valid: (value: unknown) => value is T, current: T): T {
  if (!persisted || typeof persisted !== 'object' || !(key in persisted)) return current;
  const value = (persisted as Record<string, unknown>)[key];
  return valid(value) ? value : current;
}

export const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string');
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
/** Array of objects whose `fields` are all strings (enough to tell real records from corrupted data). */
export const isRecordArray =
  (...fields: string[]) =>
  <T>(value: unknown): value is T[] =>
    Array.isArray(value) && value.every((v) => !!v && typeof v === 'object' && fields.every((f) => typeof (v as Record<string, unknown>)[f] === 'string'));
