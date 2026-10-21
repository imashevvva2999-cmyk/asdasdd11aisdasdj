/**
 * Safe browser storage for the back-office prototypes. Every read and write is guarded: blocked storage (private
 * mode, disabled site data), a throwing accessor, a full quota or corrupt JSON never break the app — values then
 * live in memory for this page load only, and `mode` tells the UI so it can say so.
 */

export type StorageMode = 'local' | 'memory';

/** The subset of the Web Storage API used here (a fake in tests). */
export type StorageBackend = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type SafeStorage = {
  /** 'local' while the browser storage works; 'memory' when it is unavailable or a write failed. */
  readonly mode: StorageMode;
  getJSON<T>(key: string): T | undefined;
  /** Returns false when the value could only be kept in memory. */
  setJSON(key: string, value: unknown): boolean;
  remove(key: string): void;
};

const PROBE_KEY = 'mmusic-backoffice:probe';

/** The page's localStorage, or null when even touching it throws. */
export function browserStorage(): StorageBackend | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createSafeStorage(backend: StorageBackend | null = browserStorage()): SafeStorage {
  const memory = new Map<string, string>();
  let mode: StorageMode = 'memory';
  if (backend) {
    try {
      backend.setItem(PROBE_KEY, '1');
      backend.removeItem(PROBE_KEY);
      mode = 'local';
    } catch {
      mode = 'memory';
    }
  }

  const readRaw = (key: string): string | null => {
    if (memory.has(key)) return memory.get(key) ?? null;
    if (mode !== 'local' || !backend) return null;
    try {
      return backend.getItem(key);
    } catch {
      return null;
    }
  };

  return {
    get mode() {
      return mode;
    },
    getJSON<T>(key: string): T | undefined {
      const raw = readRaw(key);
      if (raw === null) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    },
    setJSON(key: string, value: unknown): boolean {
      const raw = JSON.stringify(value);
      if (mode === 'local' && backend) {
        try {
          backend.setItem(key, raw);
          memory.delete(key);
          return true;
        } catch {
          // Quota or a newly blocked storage: keep working from memory for the rest of this page load.
          mode = 'memory';
        }
      }
      memory.set(key, raw);
      return false;
    },
    remove(key: string): void {
      memory.delete(key);
      if (mode !== 'local' || !backend) return;
      try {
        backend.removeItem(key);
      } catch {
        // Nothing to clean up if storage refuses.
      }
    },
  };
}
