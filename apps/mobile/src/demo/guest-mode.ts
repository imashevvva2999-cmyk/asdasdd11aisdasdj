import { create } from 'zustand';

/**
 * Public Guest Demo Preview (/demo/artist) — read-only mode flag.
 *
 * In-memory only (never persisted, never reads the personal demo account's
 * storage). While active, every mutating store action (artist, campaign,
 * support) refuses to run, so the preview stays read-only even if a write
 * action were reached; the UI additionally hides or explains those actions.
 * Standalone on purpose: the stores import this module, not the other way
 * around.
 */
export const useGuestPreviewStore = create<{ active: boolean }>(() => ({ active: false }));

export function isGuestPreview(): boolean {
  return useGuestPreviewStore.getState().active;
}

export function useIsGuestPreview(): boolean {
  return useGuestPreviewStore((s) => s.active);
}

/** Thrown by store actions that return a created entity and cannot no-op. */
export class ReadOnlyPreviewError extends Error {
  constructor() {
    super('Read-only demo preview: this action is disabled.');
    this.name = 'ReadOnlyPreviewError';
  }
}

/** Route prefix for artist screens: guest preview vs the regular app. */
export function artistBase(guest: boolean): { dashboard: string; campaign: string } {
  return guest
    ? { dashboard: '/demo/artist', campaign: '/demo/artist/campaign' }
    : { dashboard: '/profile/artist/dashboard', campaign: '/profile/artist/campaign' };
}

type AnyFn = (...args: never[]) => unknown;
type StoreLike<S> = { getState: () => S; setState: (partial: Partial<S>) => void };

/**
 * Wrap a store's mutating actions so they refuse to run during the guest
 * preview. `blocked` gives the value a refused action returns (e.g. a
 * 'failed' payment outcome); `throwing` actions raise ReadOnlyPreviewError
 * because they must return a newly created entity.
 */
export function guardStoreActions<S extends object>(
  store: StoreLike<S>,
  names: (keyof S)[],
  options: { blocked?: Partial<Record<keyof S, unknown>>; throwing?: (keyof S)[] } = {},
): void {
  const state = store.getState();
  const patch: Partial<S> = {};
  for (const name of names) {
    const original = state[name] as unknown as AnyFn;
    if (typeof original !== 'function') continue;
    patch[name] = ((...args: never[]) => {
      if (!isGuestPreview()) return original(...args);
      if (options.throwing?.includes(name)) throw new ReadOnlyPreviewError();
      return options.blocked?.[name];
    }) as unknown as S[keyof S];
  }
  store.setState(patch);
}
