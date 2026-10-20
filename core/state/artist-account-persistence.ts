import { isGuestPreview } from '../demo/guest-mode';
import { addMockArtist, addMockTrack, currentUser, type Artist } from '../mocks';
import { platformStorage, type KeyValueStorage } from '../platform/storage';
import { useArtistStore, type ArtistTrackEntry } from './artist-store';
import { useCampaignStore, type AgeGroup, type CampaignStage, type GeoScope, type LaunchedCampaign, type PaymentMethod } from './campaign-store';

/**
 * Regular (non-demo) artist account persistence — FRONTEND MVP ONLY.
 *
 * Keeps the regular artist's dashboard state in this browser's localStorage so
 * it survives a page refresh: artist profile, uploaded track metadata and
 * release status, the campaign draft, launched campaigns, pause state and the
 * promo-wallet demo balance.
 *
 * This is temporary, browser-specific storage — NOT authentication and NOT
 * backend persistence: it lives only in this browser profile, is lost when site
 * data is cleared, and is not shared across devices. Nothing secret is stored
 * (no passwords, tokens or payment details; Mmusic has no real payments yet).
 *
 * Isolation: its own key per listener account (`mmusic:artist-account:<user>`),
 * separate from the Solaris Echo demo (`mmusic:demo-artist`). Saving is paused
 * while the demo account is signed in and never runs in the Guest Preview, so
 * demo/guest data can never be written into the regular account.
 */
export const ARTIST_ACCOUNT_VERSION = 1;
export const artistAccountKey = (username: string = currentUser.username) => `mmusic:artist-account:${username}`;

export type SavedArtistAccount = {
  v: typeof ARTIST_ACCOUNT_VERSION;
  savedAt: string;
  artist?: Artist;
  entries: ArtistTrackEntry[];
  campaign: {
    trackId?: string;
    packageId?: string;
    targetGenreIds: string[];
    geoScope: GeoScope;
    ageGroups: AgeGroup[];
    customRegionIds: string[];
    description: string;
    startDate?: string;
    paymentMethod: PaymentMethod;
    walletBalanceKgs: number;
    stage: CampaignStage;
    launched: LaunchedCampaign[];
    pausedCampaignIds: string[];
  };
};

// The storage the app configured (localStorage on web; none on native, during
// static rendering or when the browser blocks it) — see platform/storage.ts.
let storage: KeyValueStorage | undefined = platformStorage;
/** Test hook: swap the storage backend (Node has no localStorage). */
export function setArtistAccountStorage(next: KeyValueStorage | undefined) {
  storage = next;
}

let restored = false; // never write before the saved state was read back
let paused = false; // demo account signed in
let applying = false;

export function setArtistPersistencePaused(next: boolean) {
  paused = next;
}

const isStringArray = (x: unknown): x is string[] => Array.isArray(x) && x.every((v) => typeof v === 'string');

/** Strict-enough shape check; anything else is treated as corrupted. */
function validate(raw: unknown): SavedArtistAccount | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<SavedArtistAccount>;
  if (r.v !== ARTIST_ACCOUNT_VERSION) return undefined;
  if (r.artist !== undefined && (typeof r.artist !== 'object' || r.artist === null || typeof r.artist.id !== 'string' || typeof r.artist.name !== 'string')) return undefined;
  if (!Array.isArray(r.entries) || !r.entries.every((e) => e && typeof e === 'object' && typeof e.track?.id === 'string' && typeof e.track?.title === 'string' && typeof e.status === 'string')) return undefined;
  const c = r.campaign;
  if (!c || typeof c !== 'object' || !isStringArray(c.targetGenreIds) || !isStringArray(c.ageGroups) || !isStringArray(c.customRegionIds) || !isStringArray(c.pausedCampaignIds)) return undefined;
  if (!Array.isArray(c.launched) || !c.launched.every((l) => l && typeof l.id === 'string' && typeof l.trackId === 'string')) return undefined;
  if (typeof c.walletBalanceKgs !== 'number' || !Number.isFinite(c.walletBalanceKgs)) return undefined;
  return r as SavedArtistAccount;
}

/** Read the saved account. Corrupted/outdated data is moved aside (kept, never loaded). */
export function readArtistAccount(username?: string): SavedArtistAccount | undefined {
  const key = artistAccountKey(username);
  let raw: string | null = null;
  try {
    raw = storage?.getItem(key) ?? null;
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const valid = validate(parsed);
  if (!valid) {
    try {
      storage?.setItem(`${key}:invalid`, raw);
      storage?.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  return valid;
}

function snapshot(): SavedArtistAccount {
  const { artist, entries } = useArtistStore.getState();
  const c = useCampaignStore.getState();
  // Bundle-local asset ids (numbers) are not stable across builds — keep only remote URIs.
  const keepUri = <T,>(uri: T) => (typeof uri === 'number' ? undefined : uri);
  return {
    v: ARTIST_ACCOUNT_VERSION,
    savedAt: new Date().toISOString(),
    artist: artist ? { ...artist, photoUri: keepUri(artist.photoUri) } : undefined,
    entries: entries.map((e) => ({ ...e, track: { ...e.track, coverUri: keepUri(e.track.coverUri) } })),
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
      // A payment in flight or a failed attempt is never persisted.
      stage: c.stage === 'processing' || c.stage === 'failed' ? 'confirming' : c.stage,
      launched: c.launched,
      pausedCampaignIds: c.pausedCampaignIds,
    },
  };
}

function save() {
  if (!restored || paused || applying || isGuestPreview()) return;
  try {
    storage?.setItem(artistAccountKey(), JSON.stringify(snapshot()));
  } catch {
    /* quota / disabled storage: keep running in-memory */
  }
}

/**
 * Load the regular artist's saved state into the app stores (client start-up,
 * and after leaving the demo account / guest preview). Never runs in the guest
 * preview or while the demo account is signed in.
 */
export function restoreArtistAccount(): void {
  if (isGuestPreview() || paused) return;
  const saved = readArtistAccount();
  applying = true;
  if (saved) {
    if (saved.artist) addMockArtist(saved.artist);
    saved.entries.filter((e) => e.status === 'published').forEach((e) => addMockTrack(e.track));
    // Uploads interrupted by the reload can't resume — show them as drafts.
    const entries = saved.entries.map((e) => (e.status === 'uploading' || e.status === 'processing' ? { ...e, status: 'draft' as const } : e));
    useArtistStore.setState({ artist: saved.artist, entries });
    useCampaignStore.setState({ ...saved.campaign, paymentError: undefined });
  }
  applying = false;
  restored = true;
}

/** Forget the regular artist's saved state (not wired to any UI yet). */
export function clearArtistAccount(username?: string) {
  try {
    storage?.removeItem(artistAccountKey(username));
  } catch {
    /* ignore */
  }
}

useArtistStore.subscribe(save);
useCampaignStore.subscribe(save);
