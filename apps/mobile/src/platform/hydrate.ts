/** A persisted store (zustand `persist` with `skipHydration`). */
export type PersistedStore = { persist: { rehydrate: () => unknown } };

/**
 * Web and Node: nothing here. The website's statically rendered HTML is made
 * with store defaults, so persisted stores rehydrate from client-only effects
 * (src/app/_layout.tsx) to keep the first paint matching it. iOS/Android use
 * hydrate.native.ts.
 */
export function hydrateOnLoad(_store: PersistedStore): void {}
