/**
 * Injected key-value storage for persisted stores (W2.4b group 6.0).
 *
 * Core never touches `window`, `localStorage`, AsyncStorage or any other
 * platform storage. Each app chooses the backend once, at start-up:
 *
 *   configureStorage(typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
 *
 * and every persisted store is created with
 * `createJSONStorage(() => platformStorage)`. Zustand captures that object
 * when the store is created, so it must exist (and keep working) before any
 * app has configured a backend — hence the explicit three-state contract:
 *
 * - `pending`     — no backend chosen yet. Writes and removals are queued in
 *                   order and replayed into the backend when one is configured,
 *                   so a store that writes before configuration loses nothing.
 *                   Reads throw `StorageNotConfiguredError`: hydrating before
 *                   configuration is a start-up ordering bug, and a silent
 *                   empty read would let the store overwrite saved data.
 * - `unavailable` — `configureStorage(null)`: there is intentionally no storage
 *                   (static rendering, server, a platform without it). Reads
 *                   return null and writes are dropped — the same no-op the apps
 *                   used before — and counted in `storageDiagnostics()`.
 * - `ready`       — reads and writes go straight to the backend; its errors
 *                   (quota, disabled storage) propagate unchanged.
 *
 * Keys and values pass through untouched, so stored data keeps its exact keys
 * and serialized format.
 */

/** The synchronous Web Storage subset persisted stores use (window.localStorage satisfies it). */
export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type StorageState = 'pending' | 'unavailable' | 'ready';

export class StorageNotConfiguredError extends Error {
  constructor(key: string) {
    super(`Storage read of "${key}" before configureStorage(): configure storage before hydrating persisted stores.`);
    this.name = 'StorageNotConfiguredError';
  }
}

type PendingWrite = { key: string; value: string | null };

let backend: KeyValueStorage | null | undefined; // undefined = pending, null = unavailable
let pending: PendingWrite[] = [];
const counters = { queued: 0, replayed: 0, dropped: 0 };

/**
 * Choose the storage backend. `null` means "intentionally no storage". Queued
 * writes are replayed into a real backend in order, or dropped (and counted)
 * when storage is unavailable. Calling it again switches backends; existing
 * data is not copied between them.
 */
export function configureStorage(next: KeyValueStorage | null): void {
  backend = next;
  const writes = pending;
  pending = [];
  for (const { key, value } of writes) {
    if (next === null) {
      counters.dropped += 1;
    } else {
      if (value === null) next.removeItem(key);
      else next.setItem(key, value);
      counters.replayed += 1;
    }
  }
}

export function storageState(): StorageState {
  return backend === undefined ? 'pending' : backend === null ? 'unavailable' : 'ready';
}

/** Counts since start-up (or the last reset): writes queued while pending, replayed into a backend, dropped as unavailable. */
export function storageDiagnostics(): { state: StorageState; pendingWrites: number; queued: number; replayed: number; dropped: number } {
  return { state: storageState(), pendingWrites: pending.length, ...counters };
}

/** The one storage object persisted stores use; it follows whatever backend is configured at call time. */
export const platformStorage: KeyValueStorage = {
  getItem(key) {
    if (backend === undefined) throw new StorageNotConfiguredError(key);
    return backend === null ? null : backend.getItem(key);
  },
  setItem(key, value) {
    write(key, value);
  },
  removeItem(key) {
    write(key, null);
  },
};

function write(key: string, value: string | null): void {
  if (backend === undefined) {
    pending.push({ key, value });
    counters.queued += 1;
  } else if (backend === null) {
    counters.dropped += 1;
  } else if (value === null) {
    backend.removeItem(key);
  } else {
    backend.setItem(key, value);
  }
}

/** Test hook: back to `pending`, with no queued writes and zeroed counters. */
export function resetStorageForTests(): void {
  backend = undefined;
  pending = [];
  counters.queued = counters.replayed = counters.dropped = 0;
}
