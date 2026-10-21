import { createStore, type StoreApi } from 'zustand/vanilla';

import type { Entity } from './domain.ts';
import type { SafeStorage } from './storage.ts';

/**
 * Mock data source for the back-office prototypes. Collections of fictional records live in one in-memory store per
 * app, seeded from fixtures and persisted to that app's own storage key ({ version, data, nextId }); a version bump,
 * corrupt or foreign data fall back to the seed. `reset()` restores the seed ("Сбросить демо-данные").
 *
 * Screens talk to it through `Repository` — async on purpose, so a future HttpDataSource (apps/api) can replace it
 * without changing them. No network, no real payments, no real personal data.
 */

export type Collections = Record<string, Entity[]>;

type Persisted<C extends Collections> = { version: number; data: C; nextId: number };

export type DataState<C extends Collections> = { data: C; nextId: number };

export interface Repository<T extends Entity> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: Omit<T, 'id' | 'mock'>): Promise<T>;
  update(id: string, patch: Partial<Omit<T, 'id' | 'mock'>>): Promise<T | undefined>;
  remove(id: string): Promise<boolean>;
}

export type MockDataSource<C extends Collections> = {
  readonly namespace: string;
  readonly store: StoreApi<DataState<C>>;
  repository<K extends keyof C & string>(name: K): Repository<C[K][number]>;
  /** Restores the fixtures and saves them. */
  reset(): void;
  /** Where edits are kept: 'local' (browser storage) or 'memory' (blocked storage: until reload). */
  persistence(): SafeStorage['mode'];
};

export type MockDataSourceOptions<C extends Collections> = {
  /** e.g. 'mmusic-arm' — the storage key is `${namespace}:data`. */
  namespace: string;
  /** Bump when the fixture shape changes; older saved data is replaced by the new seed. */
  version: number;
  seed: () => C;
  storage: SafeStorage;
};

function isValid<C extends Collections>(saved: unknown, version: number, seed: C): saved is Persisted<C> {
  if (!saved || typeof saved !== 'object') return false;
  const s = saved as Partial<Persisted<C>>;
  if (s.version !== version || typeof s.nextId !== 'number' || !s.data || typeof s.data !== 'object') return false;
  return Object.keys(seed).every((name) => Array.isArray((s.data as Record<string, unknown>)[name]));
}

export function createMockDataSource<C extends Collections>({ namespace, version, seed, storage }: MockDataSourceOptions<C>): MockDataSource<C> {
  const key = `${namespace}:data`;
  const fresh = (): DataState<C> => ({ data: seed(), nextId: 1 });
  const saved = storage.getJSON<unknown>(key);
  const initial = isValid(saved, version, seed()) ? { data: saved.data, nextId: saved.nextId } : fresh();
  const store = createStore<DataState<C>>(() => initial);
  const save = (state: DataState<C>) => storage.setJSON(key, { version, data: state.data, nextId: state.nextId } satisfies Persisted<C>);
  store.subscribe(save);

  const setCollection = <K extends keyof C>(name: K, items: C[K], nextId?: number) =>
    store.setState((s) => ({ data: { ...s.data, [name]: items }, nextId: nextId ?? s.nextId }));

  return {
    namespace,
    store,
    repository<K extends keyof C & string>(name: K): Repository<C[K][number]> {
      type T = C[K][number];
      const items = () => store.getState().data[name] as T[];
      return {
        list: async () => [...items()],
        get: async (id) => items().find((item) => item.id === id),
        create: async (input) => {
          const { nextId } = store.getState();
          const created = { ...input, id: `${name}-${namespace}-${nextId}`, mock: true } as T;
          setCollection(name, [...items(), created] as C[K], nextId + 1);
          return created;
        },
        update: async (id, patch) => {
          let updated: T | undefined;
          const next = items().map((item) => {
            if (item.id !== id) return item;
            updated = { ...item, ...patch, id: item.id, mock: true } as T;
            return updated;
          });
          if (updated) setCollection(name, next as C[K]);
          return updated;
        },
        remove: async (id) => {
          const next = items().filter((item) => item.id !== id);
          if (next.length === items().length) return false;
          setCollection(name, next as C[K]);
          return true;
        },
      };
    },
    reset() {
      store.setState(fresh(), true);
    },
    persistence: () => storage.mode,
  };
}
