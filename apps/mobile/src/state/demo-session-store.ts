import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import {
  DEMO_ARTIST_ID,
  DEMO_FIXTURE_VERSION,
  buildDemoArtist,
  buildDemoCampaign,
  buildDemoEntries,
  demoCoverFor,
  type DemoCampaignSeed,
} from '@/demo/demo-fixture';
import { isArtworkKey } from '@/constants/stitch-artwork';
import { isGuestPreview, useGuestPreviewStore } from '@/demo/guest-mode';
import { addMockArtist, addMockTrack, getArtistById, type Artist } from '@/mocks';
import { browserLocalStorage } from '@/platform/browser-storage';
import { restoreArtistAccount, setArtistPersistencePaused } from '@/state/artist-account-persistence';
import { useArtistStore, type ArtistTrackEntry } from '@/state/artist-store';
import { PROMO_WALLET_START_KGS, useCampaignStore, type CampaignStage } from '@/state/campaign-store';

/** Everything the demo account owns, as plain JSON (no local asset ids). */
export type DemoSnapshot = {
  version: number;
  artist: Artist;
  entries: ArtistTrackEntry[];
  campaign: Omit<DemoCampaignSeed, 'stage'> & { stage: CampaignStage };
};

type DemoSessionState = {
  active: boolean;
  snapshot?: DemoSnapshot;
  /** Demo login → load the saved demo state (or the fixture) into the app. */
  signIn: () => void;
  /** Leave the demo account; its saved state is kept for the next login. */
  signOut: () => void;
  /** Restore the original fixture (profile, tracks, analytics, campaigns). */
  resetDemo: () => void;
};

const noopStorage: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const demoStorage: StateStorage = browserLocalStorage() ?? noopStorage;

// The catalog's own Solaris Echo profile, restored when the demo signs out.
const catalogArtist = getArtistById(DEMO_ARTIST_ID);
const originalArtist: Artist | undefined = catalogArtist ? { ...catalogArtist } : undefined;

function freshSnapshot(): DemoSnapshot {
  const entries = buildDemoEntries();
  return { version: DEMO_FIXTURE_VERSION, artist: buildDemoArtist(entries), entries, campaign: buildDemoCampaign() };
}

/** Drop bundled artwork (asset keys, module ids) before saving; remote URIs stay. */
function stripAssets(entries: ArtistTrackEntry[]): ArtistTrackEntry[] {
  return entries.map((e) => (typeof e.track.coverUri === 'string' && !isArtworkKey(e.track.coverUri) ? e : { ...e, track: { ...e.track, coverUri: undefined } }));
}

let applying = false;

function applySnapshot(snapshot: DemoSnapshot) {
  applying = true;
  const artist: Artist = { ...snapshot.artist, photoUri: originalArtist?.photoUri ?? snapshot.artist.photoUri };
  const entries = snapshot.entries.map((e) => (e.track.coverUri ? e : { ...e, track: { ...e.track, coverUri: demoCoverFor(e.track.id) } }));
  addMockArtist(artist);
  entries.filter((e) => e.status === 'published').forEach((e) => addMockTrack(e.track));
  // A reload mid-payment can't resume the simulated call — back to Review & Pay.
  const stage = snapshot.campaign.stage === 'processing' ? 'confirming' : snapshot.campaign.stage;
  useArtistStore.setState({ artist, entries });
  useCampaignStore.setState({ ...snapshot.campaign, stage, paymentError: undefined });
  applying = false;
}

function clearApp() {
  applying = true;
  if (originalArtist) addMockArtist(originalArtist);
  useArtistStore.setState({ artist: undefined, entries: [] });
  useCampaignStore.setState({
    trackId: undefined,
    packageId: undefined,
    targetGenreIds: [],
    geoScope: 'all',
    ageGroups: ['18-24', '25-34'],
    customRegionIds: [],
    description: '',
    startDate: undefined,
    paymentMethod: 'mbank',
    paymentError: undefined,
    walletBalanceKgs: PROMO_WALLET_START_KGS,
    stage: 'selectingTrack',
    launched: [],
    pausedCampaignIds: [],
  });
  applying = false;
}

/** Current app state → snapshot (only meaningful while the demo is active). */
function captureSnapshot(version: number): DemoSnapshot | undefined {
  const { artist, entries } = useArtistStore.getState();
  if (!artist) return undefined;
  const c = useCampaignStore.getState();
  return {
    version,
    artist: { ...artist, photoUri: undefined },
    entries: stripAssets(entries),
    campaign: {
      trackId: c.trackId,
      packageId: c.packageId,
      targetGenreIds: c.targetGenreIds,
      geoScope: c.geoScope,
      ageGroups: c.ageGroups,
      customRegionIds: c.customRegionIds,
      description: c.description,
      startDate: c.startDate,
      paymentMethod: c.paymentMethod,
      walletBalanceKgs: c.walletBalanceKgs,
      stage: c.stage,
      launched: c.launched,
      pausedCampaignIds: c.pausedCampaignIds,
    },
  };
}

/**
 * Demo Artist Account session (dev/demo only — see src/demo/demo-config.ts).
 * Persisted to localStorage under its own key, separate from every real-user
 * store, so the demo artist survives reloads and dev-server restarts and never
 * mixes with a real session (the regular artist/campaign stores stay
 * in-memory). While active, every change to the artist or campaign store is
 * written back into the snapshot; Reset replaces it with the fixture.
 */
export const useDemoSessionStore = create<DemoSessionState>()(
  persist(
    (set, get) => ({
      active: false,
      snapshot: undefined,

      signIn: () => {
        const saved = get().snapshot;
        const snapshot = saved && saved.version === DEMO_FIXTURE_VERSION ? saved : freshSnapshot();
        // Regular artist persistence stops before demo data enters the app stores.
        setArtistPersistencePaused(true);
        applySnapshot(snapshot);
        set({ active: true, snapshot: captureSnapshot(DEMO_FIXTURE_VERSION) ?? snapshot });
      },

      signOut: () => {
        clearApp();
        set({ active: false });
        // Back to the regular artist account (if any) saved in this browser.
        setArtistPersistencePaused(false);
        restoreArtistAccount();
      },

      resetDemo: () => {
        const snapshot = freshSnapshot();
        applySnapshot(snapshot);
        set({ snapshot: captureSnapshot(DEMO_FIXTURE_VERSION) ?? snapshot });
      },
    }),
    {
      name: 'mmusic:demo-artist',
      version: DEMO_FIXTURE_VERSION,
      storage: createJSONStorage(() => demoStorage),
      partialize: (s) => ({ active: s.active, snapshot: s.snapshot }),
      // Same SSR-safe pattern as the locale/player stores: rehydrated from a
      // client-only effect in the root layout.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        // Never load the personal demo account into a guest preview.
        if (state?.active && !isGuestPreview()) state.signIn();
      },
    },
  ),
);

function syncFromApp() {
  // The guest preview's data never flows into the personal snapshot.
  if (applying || isGuestPreview()) return;
  if (!useDemoSessionStore.getState().active) return;
  const snapshot = captureSnapshot(DEMO_FIXTURE_VERSION);
  if (snapshot) useDemoSessionStore.setState({ snapshot });
}

useArtistStore.subscribe(syncFromApp);
useCampaignStore.subscribe(syncFromApp);

/** True while demo artist data is shown: the signed-in personal demo account
 * or the read-only guest preview (both use the same Solaris Echo fixture). */
export function useIsDemoArtist(): boolean {
  const personal = useDemoSessionStore((s) => s.active);
  const guest = useGuestPreviewStore((s) => s.active);
  return personal || guest;
}

/**
 * Public Guest Demo Preview (/demo/artist): load a fresh, immutable copy of the
 * Solaris Echo fixture into the in-memory app stores and switch on read-only
 * mode. Touches no browser storage — neither reads nor writes the personal
 * demo account (`mmusic:demo-artist`).
 */
export function enterGuestPreview() {
  useGuestPreviewStore.setState({ active: true });
  applySnapshot(freshSnapshot());
}

/** Leave the guest preview: clear its data from the app stores. */
export function exitGuestPreview() {
  if (!isGuestPreview()) return;
  clearApp();
  useGuestPreviewStore.setState({ active: false });
  restoreArtistAccount();
}
