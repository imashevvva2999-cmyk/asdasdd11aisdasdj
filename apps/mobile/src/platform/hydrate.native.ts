import type { PersistedStore } from './hydrate';

/**
 * iOS/Android: hydrate the store the moment its module loads. The SQLite
 * backend is synchronous, so this finishes before anything can render or call
 * `set` — and zustand's persist writes on every `set`, so a store used before
 * hydrating would replace saved data with its defaults. There is no static
 * HTML to match on native.
 */
export function hydrateOnLoad(store: PersistedStore): void {
  void store.persist.rehydrate();
}
