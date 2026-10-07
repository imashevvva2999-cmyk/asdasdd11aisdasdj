import type { LibraryItem } from './types';

/** Your Library mixed list (docs/screens.md §3.10 S-12). Initial seed — Library
 * screen owns mutable state (filters, future add/remove) at runtime. */
export const libraryItems: LibraryItem[] = [
  { id: 'li-1', kind: 'playlist', refId: 'late-night-driving', downloaded: false, addedAt: '2026-09-28' },
  { id: 'li-2', kind: 'artist', refId: 'solaris-echo', addedAt: '2026-09-20' },
  { id: 'li-3', kind: 'album', refId: 'horizon-deluxe', downloaded: true, addedAt: '2026-09-15' },
  { id: 'li-4', kind: 'playlist', refId: 'lofi-beats-to-code', downloaded: false, addedAt: '2026-09-10' },
  { id: 'li-5', kind: 'playlist', refId: 'electronic-essentials', downloaded: false, addedAt: '2026-09-02' },
  { id: 'li-6', kind: 'artist', refId: 'kaelen', addedAt: '2026-08-29' },
  { id: 'li-7', kind: 'album', refId: 'neo-classical-horizons', downloaded: true, addedAt: '2026-08-20' },
];

export const likedSongsCount = 842;
