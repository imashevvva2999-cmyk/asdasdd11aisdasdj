import { create } from 'zustand';

import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { getArtistDemoTotals } from '@/lib/analytics-mock';
import type { Campaign } from '@/lib/promotion';
import { addMockArtist, addMockTrack, currentUser, type Artist, type ArtistId, type Track, type TrackId } from '@/mocks';
import { DEMO_ARTIST_PROFILE, DEMO_RELEASES } from '@/mocks/demo-artist-account';

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

/** DEMO ONLY — browser key that keeps the fictional demo account across reloads.
 * Holds just a marker plus campaigns created during the demo; the account itself
 * is rebuilt deterministically by `loadDemoAccount`. A real profile clears it. */
const DEMO_ACCOUNT_KEY = 'mmusic:demo-artist';
type DemoSnapshot = { v: 1; userCampaigns: Campaign[] };

function demoStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

function readDemoSnapshot(): DemoSnapshot | undefined {
  try {
    const raw = demoStorage()?.getItem(DEMO_ACCOUNT_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<DemoSnapshot>;
    if (parsed?.v !== 1) return undefined;
    const userCampaigns = Array.isArray(parsed.userCampaigns)
      ? parsed.userCampaigns.filter((c): c is Campaign => !!c && typeof c.id === 'string' && c.simulatedPayment === true)
      : [];
    return { v: 1, userCampaigns };
  } catch {
    return undefined;
  }
}

function writeDemoSnapshot(userCampaigns: Campaign[]): void {
  try {
    demoStorage()?.setItem(DEMO_ACCOUNT_KEY, JSON.stringify({ v: 1, userCampaigns } satisfies DemoSnapshot));
  } catch {
    // Storage blocked/full — demo still works for this session.
  }
}

function clearDemoSnapshot(): void {
  try {
    demoStorage()?.removeItem(DEMO_ACCOUNT_KEY);
  } catch {
    // ignore
  }
}

const isSeededDemoCampaign = (c: Campaign) => c.id.startsWith('demo-cmp-');

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
  /** True once the dev-only "Load demo artist account" ran (all tabs show demo data). */
  demoAccount: boolean;
  /** Promotion campaigns (demo payments only — see lib/payments/mbank-payment.ts). */
  campaigns: Campaign[];

  createArtistProfile: (input: ArtistSetupInput) => Artist;
  addCampaign: (campaign: Campaign) => void;
  /** Stops delivery on an active campaign. No-op if the campaign doesn't exist or is already paused/completed. */
  pauseCampaign: (campaignId: string) => void;
  /** Resumes a paused campaign. No-op if the campaign doesn't exist, isn't paused, or is completed (completed campaigns are never resumable). */
  resumeCampaign: (campaignId: string) => void;
  /** DEMO ONLY — one-tap fully populated, fictional artist account (persisted
   * in this browser until reset or a real artist profile is created). */
  loadDemoAccount: () => void;
  /** DEMO ONLY — client startup: rebuilds the demo account if it was loaded before. */
  restoreDemoAccount: () => void;
  /** DEMO ONLY — forgets the demo account (storage + in-memory state). */
  resetDemoAccount: () => void;
  saveDraft: (input: UploadTrackInput) => ArtistTrackEntry;
  publishTrack: (trackId: TrackId) => Promise<void>;
  simulateError: (trackId: TrackId) => void;
  retryPublish: (trackId: TrackId) => Promise<void>;
  /** DEMO SEED ONLY — sets clearly non-real dashboard numbers for the
   * current local artist. No-op if no artist profile exists yet. Never
   * writes to any Artist record, so public screens keep real figures. */
  seedDemoStats: (listeners: number, streams: number) => void;
};

function buildLocalArtist(input: ArtistSetupInput): Artist {
  return {
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
}

export const useArtistStore = create<ArtistState>((set, get) => ({
  artist: undefined,
  entries: [],
  demoStreams: undefined,
  demoListeners: undefined,
  demoAccount: false,
  campaigns: [],

  addCampaign: (campaign) => {
    set((state) => ({ campaigns: [campaign, ...state.campaigns] }));
    if (get().demoAccount) writeDemoSnapshot(get().campaigns.filter((c) => !isSeededDemoCampaign(c)));
  },

  pauseCampaign: (campaignId) => {
    set((state) => ({
      campaigns: state.campaigns.map((c) => (c.id === campaignId && c.status === 'active' ? { ...c, status: 'paused' } : c)),
    }));
    if (get().demoAccount) writeDemoSnapshot(get().campaigns.filter((c) => !isSeededDemoCampaign(c)));
  },

  resumeCampaign: (campaignId) => {
    set((state) => ({
      campaigns: state.campaigns.map((c) => (c.id === campaignId && c.status === 'paused' ? { ...c, status: 'active' } : c)),
    }));
    if (get().demoAccount) writeDemoSnapshot(get().campaigns.filter((c) => !isSeededDemoCampaign(c)));
  },

  restoreDemoAccount: () => {
    const snapshot = readDemoSnapshot();
    if (!snapshot || get().demoAccount) return;
    get().loadDemoAccount();
    if (snapshot.userCampaigns.length) {
      set((state) => ({ campaigns: [...snapshot.userCampaigns, ...state.campaigns] }));
      writeDemoSnapshot(snapshot.userCampaigns);
    }
  },

  resetDemoAccount: () => {
    clearDemoSnapshot();
    set({ artist: undefined, entries: [], demoAccount: false, demoListeners: undefined, demoStreams: undefined, campaigns: [] });
  },

  loadDemoAccount: () => {
    const artist = buildLocalArtist(DEMO_ARTIST_PROFILE);
    const now = Date.now();
    const entries: ArtistTrackEntry[] = DEMO_RELEASES.map((r) => ({
      track: { id: r.id, title: r.title, artistId: artist.id, artistName: artist.name, durationSec: r.durationSec, coverUri: r.coverUri },
      status: 'published',
      createdAt: new Date(now - r.daysAgo * 86_400_000).toISOString(),
    }));
    entries.forEach((e) => addMockTrack(e.track));
    const ids = entries.map((e) => e.track.id);
    const withReleases: Artist = { ...artist, popularTrackIds: ids };
    addMockArtist(withReleases);
    const totals = getArtistDemoTotals(ids);
    const [fresh, second, third] = DEMO_RELEASES;
    const campaigns: Campaign[] = [
      { id: 'demo-cmp-osh', trackId: second!.id, trackTitle: second!.title, goal: 'streams', budgetKgs: 5000, durationDays: 14, estimatedReach: 85_000, reachSoFar: 61_200, newFollowers: 1_240, status: 'active', createdAt: new Date(now - 9 * 86_400_000).toISOString(), paymentRef: 'DEMO-7Q2K4M', simulatedPayment: true },
      { id: 'demo-cmp-issyk', trackId: third!.id, trackTitle: third!.title, goal: 'followers', budgetKgs: 2500, durationDays: 7, estimatedReach: 30_000, reachSoFar: 31_800, newFollowers: 2_150, status: 'completed', createdAt: new Date(now - 40 * 86_400_000).toISOString(), paymentRef: 'DEMO-3HX9PA', simulatedPayment: true },
      { id: 'demo-cmp-steppe', trackId: fresh!.id, trackTitle: fresh!.title, goal: 'playlists', budgetKgs: 1000, durationDays: 7, estimatedReach: 9_000, reachSoFar: 9_600, newFollowers: 420, status: 'completed', createdAt: new Date(now - 70 * 86_400_000).toISOString(), paymentRef: 'DEMO-8LM2ZT', simulatedPayment: true },
    ];
    set({ artist: withReleases, entries, demoAccount: true, demoListeners: totals.monthlyListeners, demoStreams: totals.streams, campaigns });
    writeDemoSnapshot([]);
  },

  createArtistProfile: (input) => {
    const artist = buildLocalArtist(input);
    addMockArtist(artist);
    // A real profile never inherits demo data: drop the persisted demo account,
    // its releases/campaigns, and any seeded figures.
    const wasDemo = get().demoAccount;
    clearDemoSnapshot();
    set({
      artist,
      demoListeners: undefined,
      demoStreams: undefined,
      demoAccount: false,
      ...(wasDemo ? { entries: [], campaigns: [] } : {}),
    });
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
