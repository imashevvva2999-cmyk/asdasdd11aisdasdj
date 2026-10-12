import { create } from 'zustand';

import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { addMockArtist, addMockTrack, currentUser, type Artist, type ArtistId, type Track, type TrackId } from '@/mocks';

export type UploadStatus = 'draft' | 'uploading' | 'processing' | 'published' | 'error';

export type ArtistTrackEntry = {
  track: Track;
  status: UploadStatus;
  createdAt: string;
};

export type ArtistSetupInput = {
  stageName: string;
  genre?: string;
  bio?: string;
  location?: string;
  photoUri?: LocalOrRemoteImage;
};

export type UploadTrackInput = {
  title: string;
  genre?: string;
  coverUri?: LocalOrRemoteImage;
  explicit?: boolean;
  /** Seconds — from a real file's metadata if a native picker is ever wired
   * in, a fixed mock fallback otherwise. No real audio is decoded (OQ-50). */
  durationSec?: number;
};

/** Fixed id for the current (single, local) user's own artist profile — there
 * is no real auth/account system yet, so there is exactly one possible
 * local artist per session. */
const LOCAL_ARTIST_ID: ArtistId = 'me';

/**
 * Shared frontend Artist state (Фаза 4, Batch 4 — docs/screens.md §2 Artist
 * Flow, S-25…S-28). Single boundary for: the current user's own Artist
 * profile (same `Artist` shape as S-08's public profile — created here,
 * then upserted into the shared `mocks/artists.ts` array so both S-08 and
 * S-27 read the exact same entity, never a duplicate model) and this
 * session's uploaded tracks (draft/uploading/processing/published/error).
 *
 * What is real vs simulated (Batch 4 final report): profile creation, draft
 * tracks, and status transitions are real local state mutations read by
 * every screen in the flow. `publishTrack()` awaits two local `setTimeout`s
 * standing in for a future real upload + transcode call — see the comments
 * at those call sites for exactly where to swap them in. Once a track
 * reaches `'published'`, it is inserted into the same shared mock track
 * catalog (`addMockTrack`) and linked into the artist's `popularTrackIds`,
 * which is what makes it resolvable (and playable via the existing shared
 * `usePlayerStore`) from the public Artist Profile — no second player, no
 * duplicate Track model. No MBANK payout binding, KYC/verification, real
 * upload, transcoding, or moderation is implemented (OQ-48/49/50 remain
 * unresolved and unmodeled).
 */
type ArtistState = {
  artist?: Artist;
  entries: ArtistTrackEntry[];
  /** DEMO SEED ONLY — not real analytics. Set by the dev-only demo-seed
   * screen (apps/mobile/src/app/dev-demo-seed.tsx) for the private
   * management demo. Absent in a normal session. */
  demoStreams?: number;
  /** DEMO SEED ONLY — dashboard Overview listeners. Kept off the Artist
   * record so the public profile (S-08) never shows a demo figure. */
  demoListeners?: number;

  createArtistProfile: (input: ArtistSetupInput) => Artist;
  saveDraft: (input: UploadTrackInput) => ArtistTrackEntry;
  publishTrack: (trackId: TrackId) => Promise<void>;
  simulateError: (trackId: TrackId) => void;
  retryPublish: (trackId: TrackId) => Promise<void>;
  /** DEMO SEED ONLY — sets clearly non-real dashboard numbers for the
   * current local artist. No-op if no artist profile exists yet. Never
   * writes to any Artist record, so public screens keep real figures. */
  seedDemoStats: (listeners: number, streams: number) => void;
};

export const useArtistStore = create<ArtistState>((set, get) => ({
  artist: undefined,
  entries: [],
  demoStreams: undefined,
  demoListeners: undefined,

  createArtistProfile: (input) => {
    const artist: Artist = {
      id: LOCAL_ARTIST_ID,
      name: input.stageName,
      verified: false,
      monthlyListeners: 0,
      genres: input.genre ? [input.genre] : [],
      bio: input.bio,
      location: input.location,
      photoUri: input.photoUri,
      popularTrackIds: [],
      releaseAlbumIds: [],
      fansAlsoLikeIds: [],
    };
    addMockArtist(artist);
    set({ artist });
    return artist;
  },

  saveDraft: (input) => {
    const artist = get().artist;
    const track: Track = {
      id: `artist-track-${Date.now()}`,
      title: input.title,
      artistId: artist?.id ?? LOCAL_ARTIST_ID,
      artistName: artist?.name ?? currentUser.name,
      durationSec: input.durationSec ?? 180,
      coverUri: input.coverUri,
      explicit: input.explicit,
    };
    const entry: ArtistTrackEntry = { track, status: 'draft', createdAt: new Date().toISOString() };
    set((state) => ({ entries: [entry, ...state.entries] }));
    return entry;
  },

  publishTrack: async (trackId) => {
    const setStatus = (status: UploadStatus) =>
      set((state) => ({
        entries: state.entries.map((entry) => (entry.track.id === trackId ? { ...entry, status } : entry)),
      }));

    setStatus('uploading');
    // Local-only simulated delay standing in for a future real upload call.
    await new Promise((resolve) => setTimeout(resolve, 600));

    setStatus('processing');
    // Local-only simulated delay standing in for a future real transcode /
    // moderation call (OQ-50 — exact backend timing/stages are unresolved).
    await new Promise((resolve) => setTimeout(resolve, 900));

    const entry = get().entries.find((e) => e.track.id === trackId);
    if (!entry) return;

    addMockTrack(entry.track);
    const artist = get().artist;
    if (artist) {
      const updatedArtist: Artist = { ...artist, popularTrackIds: [...(artist.popularTrackIds ?? []), trackId] };
      addMockArtist(updatedArtist);
      set({ artist: updatedArtist });
    }
    setStatus('published');
  },

  simulateError: (trackId) => {
    set((state) => ({
      entries: state.entries.map((entry) => (entry.track.id === trackId ? { ...entry, status: 'error' } : entry)),
    }));
  },

  retryPublish: async (trackId) => {
    await get().publishTrack(trackId);
  },

  seedDemoStats: (listeners, streams) => {
    if (!get().artist) return;
    set({ demoListeners: listeners, demoStreams: streams });
  },
}));
