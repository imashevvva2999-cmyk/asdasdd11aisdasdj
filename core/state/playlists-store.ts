import { create } from 'zustand';

import type { LocalOrRemoteImage } from '../constants/stitch-artwork';
import { playlists as seedPlaylists, type Playlist, type PlaylistId, type TrackId } from '../mocks';

export type CreatePlaylistInput = {
  title: string;
  description?: string;
  coverUri?: LocalOrRemoteImage;
  isPublic?: boolean;
  isCollaborative?: boolean;
  /** Auto-inserted when created from the Add to Playlist sheet's "New Playlist"
   * row (docs/screens.md §3.7 S-18 "Create and auto-insert current track"). */
  initialTrackId?: TrackId;
};

/**
 * Session-local playlist library (Фаза 4, Batch 3 — docs/screens.md §3.6 S-14,
 * §3.7 S-18). Starts from the same seed data as `mocks/playlists.ts`; playlists
 * created via Create Playlist (S-14) are appended here only, for the running
 * session — no backend persistence, per the current frontend-only milestone.
 * Add to Playlist (S-18) reads from this store (not the static mock array
 * directly) so a newly created playlist shows up immediately.
 */
type PlaylistsState = {
  playlists: Playlist[];
  createPlaylist: (input: CreatePlaylistInput) => Playlist;
  getPlaylistById: (id: PlaylistId) => Playlist | undefined;
  addTrackToPlaylist: (playlistId: PlaylistId, trackId: TrackId) => void;
  removeTrackFromPlaylist: (playlistId: PlaylistId, trackId: TrackId) => void;
};

export const usePlaylistsStore = create<PlaylistsState>((set, get) => ({
  playlists: seedPlaylists,

  createPlaylist: ({ title, description, coverUri, isPublic = true, isCollaborative = false, initialTrackId }) => {
    const trackIds = initialTrackId ? [initialTrackId] : [];
    const newPlaylist: Playlist = {
      id: `user-playlist-${Date.now()}`,
      title,
      description,
      coverUri,
      trackCount: trackIds.length,
      durationLabel: trackIds.length > 0 ? undefined : '0 min',
      trackIds,
      editorial: false,
      isPublic,
      isCollaborative,
      updatedLabel: 'Updated just now',
    };
    set((state) => ({ playlists: [newPlaylist, ...state.playlists] }));
    return newPlaylist;
  },

  getPlaylistById: (id) => get().playlists.find((playlist) => playlist.id === id),

  addTrackToPlaylist: (playlistId, trackId) => {
    set((state) => ({
      playlists: state.playlists.map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        const trackIds = playlist.trackIds ?? [];
        if (trackIds.includes(trackId)) return playlist;
        const nextTrackIds = [...trackIds, trackId];
        return { ...playlist, trackIds: nextTrackIds, trackCount: nextTrackIds.length };
      }),
    }));
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    set((state) => ({
      playlists: state.playlists.map((playlist) => {
        if (playlist.id !== playlistId || !playlist.trackIds) return playlist;
        const nextTrackIds = playlist.trackIds.filter((id) => id !== trackId);
        return { ...playlist, trackIds: nextTrackIds, trackCount: nextTrackIds.length };
      }),
    }));
  },
}));
