import { create } from 'zustand';

export type NotificationTarget =
  | { kind: 'album'; id: string }
  | { kind: 'artist'; id: string }
  | { kind: 'playlist'; id: string }
  | { kind: 'support-history' };

export type DemoNotification = {
  id: string;
  icon: string;
  title: string;
  body: string;
  timeLabel: string;
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
  {
    id: 'n-release',
    icon: 'album',
    title: 'New release',
    body: 'Solaris Echo released Horizon (Deluxe).',
    timeLabel: '2h ago',
    read: false,
    target: { kind: 'album', id: 'horizon-deluxe' },
  },
  {
    id: 'n-support',
    icon: 'volunteer-activism',
    title: 'Support completed',
    body: 'Your 100 сом support to Solaris Echo went through.',
    timeLabel: 'Yesterday',
    read: false,
    target: { kind: 'support-history' },
  },
  {
    id: 'n-playlist',
    icon: 'queue-music',
    title: 'Playlist updated',
    body: 'Late Night Flow has new tracks.',
    timeLabel: '2d ago',
    read: false,
    target: { kind: 'playlist', id: 'late-night-flow' },
  },
  {
    id: 'n-artist',
    icon: 'trending-up',
    title: 'Trending artist',
    body: 'Kaelen is trending in Electronic this week.',
    timeLabel: '4d ago',
    read: true,
    target: { kind: 'artist', id: 'kaelen' },
  },
];

type NotificationsState = {
  items: DemoNotification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: SEED,
  markRead: (id) => set((state) => ({ items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)) })),
  markAllRead: () => set((state) => ({ items: state.items.map((item) => ({ ...item, read: true })) })),
  clearAll: () => set({ items: [] }),
}));

export function countUnread(items: DemoNotification[]): number {
  return items.filter((item) => !item.read).length;
}
