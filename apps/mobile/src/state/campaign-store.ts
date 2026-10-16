import { create } from 'zustand';
import { guardStoreActions } from '@/demo/guest-mode';

import type { TrackId } from '@/mocks';

export type CampaignStage = 'selectingTrack' | 'selectingPackage' | 'settingUp' | 'confirming' | 'processing' | 'success' | 'failed';

export type GeoScope = 'all' | 'bishkek' | 'bishkek-osh' | 'custom';

export type AgeGroup = 'all' | '18-24' | '25-34' | '35-44' | '45+';

export type PaymentMethod = 'mbank' | 'wallet';

export type PaymentOutcome = 'success' | 'failed' | 'cancelled';

export type PaymentError = 'insufficientWallet';

export type LaunchedCampaign = {
  id: string;
  trackId: TrackId;
  packageId: string;
  genreIds: string[];
  geoScope: GeoScope;
  ageGroups: AgeGroup[];
  customRegionIds: string[];
  description: string;
  method: PaymentMethod;
  totalKgs: number;
  createdAt: string;
  /** Chosen campaign start (YYYY-MM-DD); end = start + package duration. */
  startDate?: string;
};

/** Stitch promo-wallet demo balance (dashboard "Промо-кошелек", Review & Pay
 * "Studio Wallet"). Local only — debited by wallet payments, never topped up. */
export const PROMO_WALLET_START_KGS = 3850;

/** Pause-state key for the static ACTIVE_CAMPAIGN demo (it has no id of its own). */
export const ACTIVE_CAMPAIGN_KEY = 'active-demo';

export const DEFAULT_AGE_GROUPS: AgeGroup[] = ['18-24', '25-34'];

export const DESCRIPTION_MAX = 300;

/** Local calendar date as YYYY-MM-DD (no time zone shift). */
export function toIsoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseIsoDay(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toIsoDay(d) === iso ? d : undefined;
}

/** A start date is valid from today up to one year ahead. */
export function isValidStartDate(iso: string, today: Date = new Date()): boolean {
  const d = parseIsoDay(iso);
  if (!d) return false;
  const min = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const max = new Date(min.getFullYear() + 1, min.getMonth(), min.getDate());
  return d >= min && d <= max;
}

export type SetupIssue = 'noGenres' | 'noRegions';

/** Inline-validation rules for the Campaign Setup step: at least one target
 * genre, and at least one region when the location is set to "custom". */
export function setupIssues(state: { targetGenreIds: string[]; geoScope: GeoScope; customRegionIds: string[] }): SetupIssue[] {
  const issues: SetupIssue[] = [];
  if (state.targetGenreIds.length === 0) issues.push('noGenres');
  if (state.geoScope === 'custom' && state.customRegionIds.length === 0) issues.push('noRegions');
  return issues;
}

/**
 * Local-only Campaign Creation wizard state (Artist Dashboard → Promotion,
 * Stitch "mmusic_studio" / Choose Music → Choose Package → Campaign Setup →
 * Campaign Preview & Payment). Same shape and honesty policy as
 * `support-store.ts`: stage transitions and the `launched` list are real
 * local mutations read by every screen in the flow; `confirm()` awaits a
 * local `setTimeout` standing in for a future real "submit campaign to
 * moderation" call — see the comment at that call site for exactly where to
 * swap it in. No MBANK charge, no moderation pipeline, no algorithmic
 * delivery is implemented (same unresolved OQ-10 scope as the Support flow).
 * The promo wallet is a local demo balance: a wallet payment larger than it
 * fails honestly instead of pretending to succeed.
 */
type CampaignState = {
  trackId?: TrackId;
  packageId?: string;
  targetGenreIds: string[];
  geoScope: GeoScope;
  ageGroups: AgeGroup[];
  customRegionIds: string[];
  description: string;
  /** Selected start day (YYYY-MM-DD); undefined = today. */
  startDate?: string;
  paymentMethod: PaymentMethod;
  paymentError?: PaymentError;
  walletBalanceKgs: number;
  stage: CampaignStage;
  launched: LaunchedCampaign[];
  pausedCampaignIds: string[];
  /** Bumped by cancelPayment() so an in-flight confirm() knows to stop. */
  attempt: number;

  startCampaign: (trackId: TrackId) => void;
  selectPackage: (packageId: string) => void;
  toggleGenre: (genreId: string) => void;
  setGeoScope: (scope: GeoScope) => void;
  toggleAgeGroup: (group: AgeGroup) => void;
  toggleRegion: (regionId: string) => void;
  setDescription: (text: string) => void;
  /** Ignored unless the date is today … one year ahead. */
  setStartDate: (iso: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  goToSetup: () => void;
  goToConfirm: () => void;
  confirm: (totalKgs: number) => Promise<PaymentOutcome>;
  cancelPayment: () => void;
  togglePause: (campaignId: string) => void;
  reset: () => void;
};

const freshDraft = {
  packageId: undefined,
  targetGenreIds: [] as string[],
  geoScope: 'all' as GeoScope,
  ageGroups: DEFAULT_AGE_GROUPS,
  customRegionIds: [] as string[],
  description: '',
  startDate: undefined as string | undefined,
  paymentError: undefined,
};

export const useCampaignStore = create<CampaignState>((set, get) => ({
  trackId: undefined,
  ...freshDraft,
  paymentMethod: 'mbank',
  walletBalanceKgs: PROMO_WALLET_START_KGS,
  stage: 'selectingTrack',
  launched: [],
  pausedCampaignIds: [],
  attempt: 0,

  // Re-picking the track already in an unfinished draft keeps the user's
  // package/audience choices; a different track (or a finished draft) starts over.
  startCampaign: (trackId) =>
    set((state) =>
      state.trackId === trackId && state.stage !== 'success'
        ? { stage: 'selectingPackage', paymentError: undefined }
        : { trackId, ...freshDraft, stage: 'selectingPackage' },
    ),

  selectPackage: (packageId) => set({ packageId, stage: 'settingUp', paymentError: undefined }),

  toggleGenre: (genreId) =>
    set((state) => ({
      targetGenreIds: state.targetGenreIds.includes(genreId)
        ? state.targetGenreIds.filter((id) => id !== genreId)
        : [...state.targetGenreIds, genreId],
    })),

  setGeoScope: (scope) => set({ geoScope: scope }),

  // "all" is exclusive; removing the last specific group falls back to "all".
  toggleAgeGroup: (group) =>
    set((state) => {
      if (group === 'all') return { ageGroups: ['all'] };
      const base = state.ageGroups.filter((g) => g !== 'all');
      const next = base.includes(group) ? base.filter((g) => g !== group) : [...base, group];
      return { ageGroups: next.length > 0 ? next : ['all'] };
    }),

  toggleRegion: (regionId) =>
    set((state) => ({
      customRegionIds: state.customRegionIds.includes(regionId)
        ? state.customRegionIds.filter((id) => id !== regionId)
        : [...state.customRegionIds, regionId],
    })),

  setDescription: (text) => set({ description: text.slice(0, DESCRIPTION_MAX) }),

  setStartDate: (iso) => {
    if (isValidStartDate(iso)) set({ startDate: iso });
  },

  setPaymentMethod: (method) => set({ paymentMethod: method, paymentError: undefined, stage: get().stage === 'failed' ? 'confirming' : get().stage }),

  goToSetup: () => set({ stage: 'settingUp' }),

  goToConfirm: () => set({ stage: 'confirming', paymentError: undefined }),

  confirm: async (totalKgs) => {
    const { trackId, packageId, targetGenreIds, geoScope, ageGroups, customRegionIds, description, startDate, paymentMethod, walletBalanceKgs, stage } = get();
    if (!trackId || !packageId || stage === 'processing') return 'failed';
    if (setupIssues(get()).length > 0) return 'failed';

    if (paymentMethod === 'wallet' && totalKgs > walletBalanceKgs) {
      set({ stage: 'failed', paymentError: 'insufficientWallet' });
      return 'failed';
    }

    const attempt = get().attempt + 1;
    set({ stage: 'processing', paymentError: undefined, attempt });

    // Local-only simulated delay standing in for a future real "charge via
    // MBANK + submit to moderation" call. Replace this `setTimeout` with that
    // call — keep awaiting it, then keep the transitions below unchanged.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (get().attempt !== attempt) return 'cancelled';

    const entry: LaunchedCampaign = {
      id: `camp-${Date.now()}`,
      trackId,
      packageId,
      genreIds: targetGenreIds,
      geoScope,
      ageGroups,
      customRegionIds: geoScope === 'custom' ? customRegionIds : [],
      description: description.trim(),
      // A start day that has meanwhile passed falls back to today.
      startDate: startDate && isValidStartDate(startDate) ? startDate : toIsoDay(new Date()),
      method: paymentMethod,
      totalKgs,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      stage: 'success',
      launched: [entry, ...state.launched],
      walletBalanceKgs: paymentMethod === 'wallet' ? state.walletBalanceKgs - totalKgs : state.walletBalanceKgs,
    }));
    return 'success';
  },

  cancelPayment: () =>
    set((state) => (state.stage === 'processing' ? { stage: 'confirming', attempt: state.attempt + 1 } : {})),

  togglePause: (campaignId) =>
    set((state) => ({
      pausedCampaignIds: state.pausedCampaignIds.includes(campaignId)
        ? state.pausedCampaignIds.filter((id) => id !== campaignId)
        : [...state.pausedCampaignIds, campaignId],
    })),

  reset: () => set({ trackId: undefined, ...freshDraft, stage: 'selectingTrack' }),
}));

// Guest Demo Preview (/demo/artist) is read-only: no campaign can be created,
// edited, paused or paid for — enforced here, not only in the UI.
guardStoreActions(
  useCampaignStore,
  ['startCampaign', 'selectPackage', 'toggleGenre', 'setGeoScope', 'toggleAgeGroup', 'toggleRegion', 'setDescription', 'setStartDate', 'setPaymentMethod', 'goToSetup', 'goToConfirm', 'confirm', 'cancelPayment', 'togglePause', 'reset'],
  { blocked: { confirm: Promise.resolve('failed') } },
);
