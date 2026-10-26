import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { currentUser, libraryItems as seedLibraryItems, type LibraryItem, type LibraryItemKind } from '../mocks';
import { appStateStorage, isRecordArray, isStringArray, persistedOr } from '../platform/app-state-storage';

/**
 * Session-local "Your Library" state (frontend functional QA pass). One
 * shared boundary for everything that saves/follows/downloads an entity, so
 * the same album/playlist/artist can't read as saved on one screen and
 * unsaved on another:
 * - Album/Playlist ♥ "Save", See All's bookmark, and Artist "Follow" all
 *   toggle membership in `items` — the exact list the Library screen renders.
 * - Download buttons toggle `downloadedIds`, which drives the Library
 *   "Downloaded" filter. Downloading something not yet in the Library also
 *   saves it (it can't be "downloaded" yet invisible in the Library).
 * - `followedGenreIds` backs the genre Follow button (OQ-40 — where followed
 *   genres are listed is still undecided; only the button state is kept).
 *
 * Frontend-only: never synced, and "downloaded" is a flag only — no audio is
 * stored offline (real downloads are backend/DRM scope, OQ-21). Kept across
 * launches by the native app only (platform/app-state-storage.ts).
 */
type LibraryState = {
  items: LibraryItem[];
  downloadedIds: Set<string>;
  followedGenreIds: Set<string>;

  isSaved: (kind: LibraryItemKind, refId: string) => boolean;
  toggleSaved: (kind: LibraryItemKind, refId: string) => void;
  isDownloaded: (refId: string) => boolean;
  toggleDownloaded: (refId: string, kind?: LibraryItemKind) => void;
  isGenreFollowed: (genreId: string) => boolean;
  toggleGenreFollowed: (genreId: string) => void;
};

function newItem(kind: LibraryItemKind, refId: string): LibraryItem {
  return { id: `li-${kind}-${refId}`, kind, refId, addedAt: new Date().toISOString() };
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
  items: seedLibraryItems,
  downloadedIds: new Set(seedLibraryItems.filter((item) => item.downloaded).map((item) => item.refId)),
  followedGenreIds: new Set(),

  isSaved: (kind, refId) => get().items.some((item) => item.kind === kind && item.refId === refId),

  toggleSaved: (kind, refId) => {
    const { items, downloadedIds } = get();
    if (items.some((item) => item.kind === kind && item.refId === refId)) {
      const remaining = items.filter((item) => !(item.kind === kind && item.refId === refId));
      // Only drop the download when no other saved entity shares this id.
      const nextDownloaded = new Set(downloadedIds);
      if (!remaining.some((item) => item.refId === refId)) nextDownloaded.delete(refId);
      set({ items: remaining, downloadedIds: nextDownloaded });
    } else {
      set({ items: [newItem(kind, refId), ...items] });
    }
  },

  isDownloaded: (refId) => get().downloadedIds.has(refId),

  toggleDownloaded: (refId, kind) => {
    const nextDownloaded = new Set(get().downloadedIds);
    if (nextDownloaded.has(refId)) {
      nextDownloaded.delete(refId);
      set({ downloadedIds: nextDownloaded });
      return;
    }
    nextDownloaded.add(refId);
    const { items } = get();
    const needsSave = kind !== undefined && !items.some((item) => item.kind === kind && item.refId === refId);
    set({ downloadedIds: nextDownloaded, items: needsSave ? [newItem(kind, refId), ...items] : items });
  },

  isGenreFollowed: (genreId) => get().followedGenreIds.has(genreId),

  toggleGenreFollowed: (genreId) => {
    const next = new Set(get().followedGenreIds);
    if (next.has(genreId)) {
      next.delete(genreId);
    } else {
      next.add(genreId);
    }
    set({ followedGenreIds: next });
  },
    }),
    {
      name: `mmusic:library:${currentUser.username}`,
      storage: createJSONStorage(() => appStateStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items, downloadedIds: [...state.downloadedIds], followedGenreIds: [...state.followedGenreIds] }),
      merge: (persisted, current) => ({
        ...current,
        items: persistedOr(persisted, 'items', isRecordArray('id', 'kind', 'refId')<LibraryItem>, current.items),
        downloadedIds: new Set(persistedOr(persisted, 'downloadedIds', isStringArray, [...current.downloadedIds])),
        followedGenreIds: new Set(persistedOr(persisted, 'followedGenreIds', isStringArray, [...current.followedGenreIds])),
      }),
    },
  ),
);
