import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { APP_STRINGS, type AppStringKey } from '../lib/i18n';
import { currentUser } from '../mocks';
import { appStateStorage, persistedOr } from '../platform/app-state-storage';

export type NotificationTarget =
  | { kind: 'album'; id: string }
  | { kind: 'artist'; id: string }
  | { kind: 'playlist'; id: string }
  | { kind: 'support-history' };

/** Content stays out of the session-local store state (title/body/time are
 * localized, looked up by id via `notificationContent()`, not stored text). */
export type DemoNotification = {
  id: string;
  icon: string;
  read: boolean;
  target: NotificationTarget;
};

/**
 * Demo notifications for the Search header bell (OQ-27 — notification types
 * and delivery are undecided; there is no push or backend). A fixed local
 * list, clearly labelled "Demo" in the UI, with read / clear state for this
 * session only.
 */
const SEED: DemoNotification[] = [
  { id: 'n-release', icon: 'album', read: false, target: { kind: 'album', id: 'horizon-deluxe' } },
  { id: 'n-support', icon: 'volunteer-activism', read: false, target: { kind: 'support-history' } },
  { id: 'n-playlist', icon: 'queue-music', read: false, target: { kind: 'playlist', id: 'late-night-flow' } },
  { id: 'n-artist', icon: 'trending-up', read: true, target: { kind: 'artist', id: 'kaelen' } },
];

/** title/body/timeLabel for each fixed demo notification id, per locale. */
const NOTIFICATION_CONTENT_KEYS: Record<string, { title: AppStringKey; body: AppStringKey; time: AppStringKey }> = {
  'n-release': { title: 'notifReleaseTitle', body: 'notifReleaseBody', time: 'notifReleaseTime' },
  'n-support': { title: 'notifSupportTitle', body: 'notifSupportBody', time: 'notifSupportTime' },
  'n-playlist': { title: 'notifPlaylistTitle', body: 'notifPlaylistBody', time: 'notifPlaylistTime' },
  'n-artist': { title: 'notifArtistTitle', body: 'notifArtistBody', time: 'notifArtistTime' },
};

export function notificationContent(id: string, locale: 'en' | 'ru'): { title: string; body: string; timeLabel: string } {
  const keys = NOTIFICATION_CONTENT_KEYS[id];
  const s = APP_STRINGS[locale];
  return keys ? { title: s[keys.title], body: s[keys.body], timeLabel: s[keys.time] } : { title: '', body: '', timeLabel: '' };
}

type NotificationsState = {
  items: DemoNotification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

type SavedNotification = { id: string; read: boolean };
const isSavedList = (value: unknown): value is SavedNotification[] =>
  Array.isArray(value) && value.every((v) => !!v && typeof v === 'object' && typeof (v as SavedNotification).id === 'string' && typeof (v as SavedNotification).read === 'boolean');

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      items: SEED,
      markRead: (id) => set((state) => ({ items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)) })),
      markAllRead: () => set((state) => ({ items: state.items.map((item) => ({ ...item, read: true })) })),
      clearAll: () => set({ items: [] }),
    }),
    {
      // Kept across launches by the native app only (platform/app-state-storage.ts):
      // which fixed demo notifications are read or cleared. Icon and target always
      // come from SEED; ids it no longer has are dropped.
      name: `mmusic:notifications:${currentUser.username}`,
      storage: createJSONStorage(() => appStateStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items.map(({ id, read }) => ({ id, read })) }),
      merge: (persisted, current) => {
        const saved = persistedOr<SavedNotification[] | undefined>(persisted, 'items', isSavedList, undefined);
        if (!saved) return current;
        const seed = new Map(SEED.map((item) => [item.id, item]));
        return { ...current, items: saved.flatMap(({ id, read }) => (seed.has(id) ? [{ ...seed.get(id)!, read }] : [])) };
      },
    },
  ),
);

export function countUnread(items: DemoNotification[]): number {
  return items.filter((item) => !item.read).length;
}
