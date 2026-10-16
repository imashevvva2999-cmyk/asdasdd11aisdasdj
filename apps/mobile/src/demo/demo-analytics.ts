import type { LocalizedText } from '@/lib/dashboard-i18n';
import { getTrackAnalytics, type TrendPoint } from '@/lib/analytics-mock';
import { resolveCampaignView } from '@/lib/campaign-view';
import type { ArtistTrackEntry } from '@/state/artist-store';
import type { LaunchedCampaign } from '@/state/campaign-store';

import { DEMO_CAMPAIGN_HISTORY } from './demo-fixture';

export type DemoPeriod = '7d' | '30d' | '90d';
export const DEMO_PERIODS: DemoPeriod[] = ['7d', '30d', '90d'];
const PERIOD_DAYS: Record<DemoPeriod, number> = { '7d': 7, '30d': 30, '90d': 90 };

export type DemoShare = { label: LocalizedText; pct: number; count: number };

export type DemoArtistAnalytics = {
  streams: number;
  listeners: number;
  saves: number;
  saveRatePct: number;
  engagementPct: number;
  attributedStreams: number;
  attributedPct: number;
  trend: TrendPoint[];
  peak: number;
  ages: DemoShare[];
  geography: (DemoShare & { region: 'kg' | 'abroad' })[];
  sources: DemoShare[];
  topTracks: { trackId: string; title: string; coverUri?: ArtistTrackEntry['track']['coverUri']; streams: number; sharePct: number }[];
  history: { label: LocalizedText; streams: number }[];
};

const MONTHS: LocalizedText[] = [
  { en: 'Jan', ru: 'янв' }, { en: 'Feb', ru: 'фев' }, { en: 'Mar', ru: 'мар' }, { en: 'Apr', ru: 'апр' }, { en: 'May', ru: 'май' }, { en: 'Jun', ru: 'июн' },
  { en: 'Jul', ru: 'июл' }, { en: 'Aug', ru: 'авг' }, { en: 'Sep', ru: 'сен' }, { en: 'Oct', ru: 'окт' }, { en: 'Nov', ru: 'ноя' }, { en: 'Dec', ru: 'дек' },
];

const AGES: { label: LocalizedText; pct: number }[] = [
  { label: { en: '13–17', ru: '13–17' }, pct: 7 },
  { label: { en: '18–24', ru: '18–24' }, pct: 34 },
  { label: { en: '25–34', ru: '25–34' }, pct: 31 },
  { label: { en: '35–44', ru: '35–44' }, pct: 17 },
  { label: { en: '45+', ru: '45+' }, pct: 11 },
];

const GEO: { label: LocalizedText; pct: number; region: 'kg' | 'abroad' }[] = [
  { label: { en: 'Bishkek', ru: 'Бишкек' }, pct: 36, region: 'kg' },
  { label: { en: 'Osh', ru: 'Ош' }, pct: 13, region: 'kg' },
  { label: { en: 'Chui region', ru: 'Чуйская обл.' }, pct: 9, region: 'kg' },
  { label: { en: 'Issyk-Kul', ru: 'Иссык-Куль' }, pct: 5, region: 'kg' },
  { label: { en: 'Jalal-Abad', ru: 'Джалал-Абад' }, pct: 4, region: 'kg' },
  { label: { en: 'Kazakhstan', ru: 'Казахстан' }, pct: 15, region: 'abroad' },
  { label: { en: 'Russia', ru: 'Россия' }, pct: 9, region: 'abroad' },
  { label: { en: 'Uzbekistan', ru: 'Узбекистан' }, pct: 5, region: 'abroad' },
  { label: { en: 'Other countries', ru: 'Другие страны' }, pct: 4, region: 'abroad' },
];

/** Organic traffic split; the promo share is computed from campaign data and
 * these weights fill the remaining percentage. */
const ORGANIC_SOURCES: { label: LocalizedText; weight: number }[] = [
  { label: { en: 'Mmusic For You', ru: 'Mmusic For You' }, weight: 40 },
  { label: { en: 'Playlists', ru: 'Плейлисты' }, weight: 25 },
  { label: { en: 'Search', ru: 'Поиск' }, weight: 15 },
  { label: { en: 'Artist profile', ru: 'Профиль артиста' }, weight: 12 },
  { label: { en: 'External links', ru: 'Внешние ссылки' }, weight: 8 },
];

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Split `total` into whole numbers proportional to `weights` (sums exactly). */
function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0 && order.length > 0; k = (k + 1) % order.length, rest -= 1) out[order[k]![1]]! += 1;
  return out;
}

/** Per-track figures for a period, from the same analytics mock the per-track
 * view uses: 7d and 30d (= the mock's 28-day window) directly, 90d scaled from
 * the 28-day window (listeners overlap between months, so they grow slower). */
function trackFigures(trackId: string, period: DemoPeriod) {
  if (period === '7d') {
    const a = getTrackAnalytics(trackId, '7d');
    return { streams: a.streams, listeners: a.listeners, saves: a.playlistAdds, completion: a.completionPct };
  }
  const a = getTrackAnalytics(trackId, '28d');
  const k = period === '30d' ? 1 : 3.1;
  const kl = period === '30d' ? 1 : 2.2;
  return { streams: Math.round(a.streams * k), listeners: Math.round(a.listeners * kl), saves: Math.round(a.playlistAdds * k), completion: a.completionPct };
}

/** Streams attributed to promotion campaigns that ran inside the window:
 * impressions × conversion rate, using the exact numbers the Promotion tab and
 * Campaign Analytics show for each campaign. */
export function attributedStreams(period: DemoPeriod, launched: LaunchedCampaign[], now: Date = new Date()): number {
  const windowStart = now.getTime() - PERIOD_DAYS[period] * 86400000;
  const active = resolveCampaignView(undefined, 'active', launched, DEMO_CAMPAIGN_HISTORY).data;
  let total = Math.round((active.reach * active.conversionRatePct) / 100);
  for (const h of DEMO_CAMPAIGN_HISTORY) {
    if (!h.endedAt || Date.parse(h.endedAt) < windowStart) continue;
    const v = resolveCampaignView(h.id, 'active', launched, DEMO_CAMPAIGN_HISTORY).data;
    total += Math.round((v.reach * v.conversionRatePct) / 100);
  }
  return total;
}

/**
 * Artist-level DEMO analytics for the demo account. Totals are summed from the
 * per-track analytics mock (so 30-day listeners equal Overview's listeners);
 * attributed streams come from the Promotion campaigns. Age, geography and
 * organic-source splits are fixed demo distributions.
 */
export function buildDemoArtistAnalytics(entries: ArtistTrackEntry[], period: DemoPeriod, launched: LaunchedCampaign[], now: Date = new Date()): DemoArtistAnalytics {
  const published = entries.filter((e) => e.status === 'published');
  const perTrack = published.map((e) => ({ entry: e, ...trackFigures(e.track.id, period) }));
  const streams = perTrack.reduce((s, t) => s + t.streams, 0);
  const listeners = perTrack.reduce((s, t) => s + t.listeners, 0);
  const saves = perTrack.reduce((s, t) => s + t.saves, 0);
  const engagementPct = streams ? Math.round(perTrack.reduce((s, t) => s + t.completion * t.streams, 0) / streams) : 0;

  const attributed = Math.min(attributedStreams(period, launched, now), streams);
  const attributedPct = streams ? Math.round((attributed / streams) * 1000) / 10 : 0;

  // Trend: 7 daily, 10 three-day or 13 weekly points, summing to the period's streams.
  const points = period === '7d' ? 7 : period === '30d' ? 10 : 13;
  const rand = seeded(points * 7919 + published.length);
  const trendValues = apportion(
    streams,
    Array.from({ length: points }, (_, i) => 0.8 + 0.35 * (i / points) + rand() * 0.3),
  );
  const trend = trendValues.map((value, i) => {
    const daysBack = Math.round(((points - 1 - i) * PERIOD_DAYS[period]) / points);
    const d = new Date(now.getTime() - daysBack * 86400000);
    return { label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`, value };
  });

  const share = (rows: { label: LocalizedText; pct: number }[], base: number): DemoShare[] => {
    const counts = apportion(base, rows.map((r) => r.pct));
    return rows.map((r, i) => ({ label: r.label, pct: r.pct, count: counts[i]! }));
  };

  const organicPct = 100 - attributedPct;
  const organicCounts = apportion(streams - attributed, ORGANIC_SOURCES.map((s) => s.weight));
  const sources: DemoShare[] = [
    ...ORGANIC_SOURCES.map((s, i) => ({ label: s.label, pct: Math.round(organicPct * s.weight) / 100, count: organicCounts[i]! })),
    { label: { en: 'Promotion campaigns', ru: 'Промо-кампании' }, pct: attributedPct, count: attributed },
  ];

  const topTracks = [...perTrack]
    .sort((a, b) => b.streams - a.streams)
    .slice(0, 5)
    .map((t) => ({
      trackId: t.entry.track.id,
      title: t.entry.track.title,
      coverUri: t.entry.track.coverUri,
      streams: t.streams,
      sharePct: streams ? Math.round((t.streams / streams) * 1000) / 10 : 0,
    }));

  // Historical: last six calendar months; the latest equals the 30-day total.
  const monthly30 = published.reduce((s, e) => s + getTrackAnalytics(e.track.id, '28d').streams, 0);
  const growth = [0.58, 0.66, 0.74, 0.83, 0.92, 1];
  const history = growth.map((g, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: MONTHS[m.getMonth()]!, streams: Math.round(monthly30 * g) };
  });

  return {
    streams,
    listeners,
    saves,
    saveRatePct: streams ? Math.round((saves / streams) * 1000) / 10 : 0,
    engagementPct,
    attributedStreams: attributed,
    attributedPct,
    trend,
    peak: Math.max(0, ...trendValues),
    ages: share(AGES, listeners),
    geography: share(GEO, listeners).map((g, i) => ({ ...g, region: GEO[i]!.region })),
    sources,
    topTracks,
    history,
  };
}
