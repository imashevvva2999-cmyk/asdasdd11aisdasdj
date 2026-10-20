import type { LocalizedText } from '../lib/dashboard-i18n';
import { getTrackAnalytics } from '../lib/analytics-mock';
import { getArtistById, getTrackById, type Artist, type Track, type TrackId } from '../mocks';
import type { CampaignHistoryEntry } from '../mocks/promotions';
import type { ArtistTrackEntry, UploadStatus } from '../state/artist-store';
import type { AgeGroup, GeoScope, LaunchedCampaign, PaymentMethod } from '../state/campaign-store';

/**
 * Versioned Demo Artist Account fixture (dev/demo only — see demo-config.ts).
 * Identity: the existing catalog artist "Solaris Echo". Five tracks are the
 * real catalog's Horizon (Deluxe) tracks (with their demo audio, where it
 * exists); the rest are metadata-only demo releases that reuse existing
 * Solaris artwork and have NO audio — the player reports them unavailable.
 * Every number on Overview is derived from the same analytics mock the
 * Analytics tab reads, so the two always match. Bump DEMO_FIXTURE_VERSION when
 * the shape or content changes; a stored snapshot of an older version is
 * replaced by the new fixture.
 */
export const DEMO_FIXTURE_VERSION = 1;
export const DEMO_ARTIST_ID = 'solaris-echo';

type DemoTrackSeed = {
  id: TrackId;
  title: string;
  genre: string;
  releasedAt: string;
  status: UploadStatus;
  durationSec: number;
  /** Existing catalog track whose artwork this release reuses. */
  coverFrom: TrackId;
  albumId?: string;
};

const SEEDS: DemoTrackSeed[] = [
  { id: 'midnight-mirage', title: 'Midnight Mirage', genre: 'Electronic', releasedAt: '2024-03-08T09:00:00.000Z', status: 'published', durationSec: 240, coverFrom: 'midnight-mirage', albumId: 'horizon-deluxe' },
  { id: 'horizon', title: 'Horizon', genre: 'Ambient', releasedAt: '2024-03-08T09:00:00.000Z', status: 'published', durationSec: 184, coverFrom: 'horizon', albumId: 'horizon-deluxe' },
  { id: 'obsidian-frequencies', title: 'Obsidian Frequencies', genre: 'Electronic', releasedAt: '2024-03-08T09:00:00.000Z', status: 'published', durationSec: 230, coverFrom: 'obsidian-frequencies', albumId: 'horizon-deluxe' },
  { id: 'ember-tide', title: 'Ember Tide', genre: 'Synthwave', releasedAt: '2024-03-08T09:00:00.000Z', status: 'published', durationSec: 162, coverFrom: 'ember-tide', albumId: 'horizon-deluxe' },
  { id: 'resonant-field-reprise', title: 'Resonant Field (Reprise)', genre: 'Ambient', releasedAt: '2024-03-08T09:00:00.000Z', status: 'published', durationSec: 177, coverFrom: 'resonant-field-reprise', albumId: 'horizon-deluxe' },
  { id: 'se-tien-shan-dawn', title: 'Tien Shan Dawn', genre: 'Ambient', releasedAt: '2025-02-14T09:00:00.000Z', status: 'published', durationSec: 214, coverFrom: 'horizon' },
  { id: 'se-glass-steppe', title: 'Glass Steppe', genre: 'Electronic', releasedAt: '2025-05-30T09:00:00.000Z', status: 'published', durationSec: 201, coverFrom: 'obsidian-frequencies' },
  { id: 'se-issyk-kul-nocturne', title: 'Issyk-Kul Nocturne', genre: 'Neo-Classical', releasedAt: '2025-09-12T09:00:00.000Z', status: 'published', durationSec: 246, coverFrom: 'resonant-field-reprise' },
  { id: 'se-sodium-lights', title: 'Sodium Lights', genre: 'Synthwave', releasedAt: '2026-01-23T09:00:00.000Z', status: 'published', durationSec: 189, coverFrom: 'ember-tide' },
  { id: 'se-afterglow-protocol', title: 'Afterglow Protocol', genre: 'Electronic', releasedAt: '2026-06-05T09:00:00.000Z', status: 'published', durationSec: 223, coverFrom: 'midnight-mirage' },
  { id: 'se-quiet-orbit', title: 'Quiet Orbit', genre: 'Lo-Fi', releasedAt: '2026-10-10T09:00:00.000Z', status: 'processing', durationSec: 176, coverFrom: 'horizon' },
  { id: 'se-night-market', title: 'Night Market (Demo)', genre: 'Hip-Hop', releasedAt: '2026-10-14T09:00:00.000Z', status: 'draft', durationSec: 158, coverFrom: 'obsidian-frequencies' },
];

/** Artwork for a demo track, resolved fresh every time (local asset ids are
 * not stable across bundles, so they are never persisted). */
export function demoCoverFor(trackId: TrackId): Track['coverUri'] {
  const seed = SEEDS.find((s) => s.id === trackId);
  return seed ? getTrackById(seed.coverFrom)?.coverUri : undefined;
}

export function buildDemoEntries(): ArtistTrackEntry[] {
  return SEEDS.map((s) => ({
    status: s.status,
    createdAt: s.releasedAt,
    genre: s.genre,
    track: {
      ...(getTrackById(s.id) ?? {}),
      id: s.id,
      title: s.title,
      artistId: DEMO_ARTIST_ID,
      artistName: 'Solaris Echo',
      albumId: s.albumId,
      durationSec: s.durationSec,
      coverUri: demoCoverFor(s.id),
    },
  }));
}

/** Artist-level totals, summed from the per-track analytics the Analytics tab
 * shows: monthly listeners = 28-day listeners, streams = all-time streams. */
export function demoTotals(entries: ArtistTrackEntry[]) {
  const published = entries.filter((e) => e.status === 'published');
  return published.reduce(
    (acc, e) => {
      acc.monthlyListeners += getTrackAnalytics(e.track.id, '28d').listeners;
      acc.streams += getTrackAnalytics(e.track.id, 'all').streams;
      acc.saves += getTrackAnalytics(e.track.id, 'all').playlistAdds;
      return acc;
    },
    { monthlyListeners: 0, streams: 0, saves: 0 },
  );
}

/** Support received (сом) — fixed demo figure, labeled DEMO in the UI. */
export const DEMO_SUPPORT_TOTAL_KGS = 18640;

export function buildDemoArtist(entries: ArtistTrackEntry[]): Artist {
  const base = getArtistById(DEMO_ARTIST_ID);
  const published = entries.filter((e) => e.status === 'published');
  const byStreams = [...published].sort((a, b) => getTrackAnalytics(b.track.id, 'all').streams - getTrackAnalytics(a.track.id, 'all').streams);
  return {
    ...(base ?? { id: DEMO_ARTIST_ID, name: 'Solaris Echo' }),
    id: DEMO_ARTIST_ID,
    name: 'Solaris Echo',
    verified: true,
    genres: ['Electronic', 'Ambient', 'Synthwave'],
    location: 'Bishkek, Kyrgyzstan',
    monthlyListeners: demoTotals(entries).monthlyListeners,
    popularTrackIds: byStreams.slice(0, 5).map((e) => e.track.id),
    releaseAlbumIds: ['horizon-deluxe'],
  };
}

export type DemoCampaignSeed = {
  trackId?: TrackId;
  packageId?: string;
  targetGenreIds: string[];
  geoScope: GeoScope;
  ageGroups: AgeGroup[];
  customRegionIds: string[];
  description: string;
  startDate?: string;
  paymentMethod: PaymentMethod;
  walletBalanceKgs: number;
  stage: 'settingUp';
  launched: LaunchedCampaign[];
  pausedCampaignIds: string[];
};

/** Promotion seed: one campaign in review, plus an unfinished draft (Ember
 * Tide / BOOST) that "Draft" in campaign history resumes. The active campaign
 * is the shared ACTIVE_CAMPAIGN (Midnight Mirage). */
export function buildDemoCampaign(): DemoCampaignSeed {
  return {
    trackId: 'ember-tide',
    packageId: 'boost',
    targetGenreIds: ['electronic-dance', 'chill-lofi'],
    geoScope: 'bishkek',
    ageGroups: ['18-24', '25-34'],
    customRegionIds: [],
    description: 'Autumn re-push of a Horizon (Deluxe) favourite',
    paymentMethod: 'mbank',
    walletBalanceKgs: 3850,
    stage: 'settingUp',
    launched: [
      {
        id: 'camp-demo-glass-steppe',
        trackId: 'se-glass-steppe',
        packageId: 'pro',
        genreIds: ['electronic-dance', 'kyrgyz-music'],
        geoScope: 'bishkek-osh',
        ageGroups: ['18-24', '25-34'],
        customRegionIds: [],
        description: 'Summer single for evening drives',
        method: 'mbank',
        totalKgs: 765,
        createdAt: '2026-10-14T09:30:00.000Z',
      },
    ],
    pausedCampaignIds: [],
  };
}

/** Completed campaigns for the demo artist's own tracks (replaces the generic
 * CAMPAIGN_HISTORY while the demo account is signed in). */
export const DEMO_CAMPAIGN_HISTORY: CampaignHistoryEntry[] = [
  {
    id: 'demo-hist-obsidian',
    endedAt: '2026-08-30',
    trackId: 'obsidian-frequencies',
    trackTitle: 'Obsidian Frequencies',
    metric: { en: '+38% streams', ru: '+38% стримов' },
    completedLabel: { en: 'Completed Aug 30 · 14 days', ru: 'Завершена 30 авг · 14 дней' },
    reach: 41200,
    budgetKgs: 900,
    formatBadge: { en: 'Single', ru: 'Сингл' },
  },
  {
    id: 'demo-hist-horizon-deluxe',
    endedAt: '2026-06-18',
    trackId: 'horizon',
    trackTitle: 'Horizon (Deluxe)',
    metric: { en: '+2,140 fans', ru: '+2 140 фанатов' },
    completedLabel: { en: 'Completed Jun 18 · 21 days', ru: 'Завершена 18 июн · 21 день' },
    reach: 68400,
    budgetKgs: 1300,
    formatBadge: { en: 'Album', ru: 'Релиз' },
  },
  {
    id: 'demo-hist-tien-shan',
    endedAt: '2026-03-02',
    trackId: 'se-tien-shan-dawn',
    trackTitle: 'Tien Shan Dawn',
    metric: { en: '+19% saves', ru: '+19% сохранений' },
    completedLabel: { en: 'Completed Mar 2 · 7 days', ru: 'Завершена 2 мар · 7 дней' },
    reach: 18900,
    budgetKgs: 500,
    formatBadge: { en: 'Single', ru: 'Сингл' },
  },
];

/** Studio Pro demo subscription — display only, no billing. */
export const DEMO_SUBSCRIPTION: {
  planId: 'studio-pro';
  since: string;
  renews: string;
  priceYearKgs: number;
  usage: { label: LocalizedText; value: string }[];
} = {
  planId: 'studio-pro',
  since: '2026-04-01',
  renews: '2027-04-01',
  priceYearKgs: 3740,
  usage: [
    { label: { en: 'Releases this year', ru: 'Релизов в этом году' }, value: '4' },
    { label: { en: 'Promo campaigns', ru: 'Промо-кампаний' }, value: '5' },
    { label: { en: 'Promo discount', ru: 'Скидка на промо' }, value: '−15%' },
    { label: { en: 'Payout fee', ru: 'Комиссия вывода' }, value: '0%' },
  ],
};
