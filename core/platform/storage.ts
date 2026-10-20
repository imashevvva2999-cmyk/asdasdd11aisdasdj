/**
 * Injected key-value storage for persisted stores (W2.4b group 6.0, connected in 6.3).
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
 *                   order. On configuration they are replayed only for keys
 *                   that hold no stored value: a key that already holds data
 *                   keeps it — a write made before configuration can never
 *                   overwrite saved user data — and the skipped writes are
 *                   reported. Reads throw `StorageNotConfiguredError`:
 *                   hydrating before configuration is a start-up ordering bug,
 *                   and a silent empty read would let the store overwrite
 *                   saved data.
 * - `unavailable` — `configureStorage(null)`: there is intentionally no storage
 *                   (static rendering, server, a platform without it). Reads
 *                   return null and writes are dropped — the same no-op the apps
 *                   used before — and counted in `storageDiagnostics()`.
 * - `ready`       — reads and writes go straight to the backend; its errors
 *                   (quota, disabled storage) propagate unchanged.
 *
 * Keys and values pass through untouched, so stored data keeps its exact keys
 * and serialized format. Misuse (a read or write before configuration, a
 * replay skipped to protect saved data) is reported to an optional listener
 * with the key only — never a value — so an app can warn in development.
 */

/** The synchronous Web Storage subset persisted stores use (window.localStorage satisfies it). */
export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type StorageState = 'pending' | 'unavailable' | 'ready';

export type StorageMisuse =
  | { kind: 'read-before-configure'; key: string }
  | { kind: 'write-before-configure'; key: string }
  | { kind: 'replay-skipped-existing-data'; key: string };

export class StorageNotConfiguredError extends Error {
  constructor(key: string) {
    super(`Storage read of "${key}" before configureStorage(): configure storage before hydrating persisted stores.`);
    this.name = 'StorageNotConfiguredError';
  }
}

type PendingWrite = { key: string; value: string | null };

let backend: KeyValueStorage | null | undefined; // undefined = pending, null = unavailable
let pending: PendingWrite[] = [];
const counters = { queued: 0, replayed: 0, skipped: 0, dropped: 0 };
let misuse: StorageMisuse[] = [];
let listener: ((event: StorageMisuse) => void) | undefined;

function report(event: StorageMisuse): void {
  misuse.push(event);
  listener?.(event);
}

/**
 * Receive misuse events (keys only). Events recorded before the listener was
 * set are delivered immediately, so start-up problems are never missed.
 */
export function setStorageMisuseListener(next: ((event: StorageMisuse) => void) | undefined): void {
  listener = next;
  if (next) for (const event of misuse) next(event);
}

/**
 * Choose the storage backend. `null` means "intentionally no storage". Queued
 * writes are replayed in order into a real backend — except for keys that
 * already hold stored data, which keep it (reported) — or dropped (and
 * counted) when storage is unavailable. Calling it again switches backends;
 * existing data is not copied between them.
 */
export function configureStorage(next: KeyValueStorage | null): void {
  backend = next;
  const writes = pending;
  pending = [];
  if (next === null) {
    counters.dropped += writes.length;
    return;
  }
  const protectedKeys = new Set(writes.map((w) => w.key).filter((key) => next.getItem(key) !== null));
  for (const key of protectedKeys) report({ kind: 'replay-skipped-existing-data', key });
  for (const { key, value } of writes) {
    if (protectedKeys.has(key)) {
      counters.skipped += 1;
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

/** Counts since start-up (or the last reset): writes queued while pending, replayed, skipped to protect stored data, dropped as unavailable; misuse events. */
export function storageDiagnostics(): { state: StorageState; pendingWrites: number; queued: number; replayed: number; skipped: number; dropped: number; misuse: StorageMisuse[] } {
  return { state: storageState(), pendingWrites: pending.length, ...counters, misuse: [...misuse] };
}

/** The one storage object persisted stores use; it follows whatever backend is configured at call time. */
export const platformStorage: KeyValueStorage = {
  getItem(key) {
    if (backend === undefined) {
      report({ kind: 'read-before-configure', key });
      throw new StorageNotConfiguredError(key);
    }
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
    report({ kind: 'write-before-configure', key });
  } else if (backend === null) {
    counters.dropped += 1;
  } else if (value === null) {
    backend.removeItem(key);
  } else {
    backend.setItem(key, value);
  }
}

/** Test hook: back to `pending`, with no queued writes, zeroed counters, no misuse record and no listener. */
export function resetStorageForTests(): void {
  backend = undefined;
  pending = [];
  counters.queued = counters.replayed = counters.skipped = counters.dropped = 0;
  misuse = [];
  listener = undefined;
}
