import type { LocalizedText } from './dashboard-i18n';

/**
 * Deterministic mock analytics (Artist Dashboard Analytics). No real
 * telemetry exists — every number here is seeded from the track id and
 * period so the same selection always shows the same figures, and
 * different selections visibly differ, without ever being random noise
 * on re-render.
 */
export type TimePeriod = '24h' | '7d' | '28d' | 'all';

export type TrendPoint = { label: string; value: number };

export type TrackAnalytics = {
  streams: number;
  streamsDeltaPct: number;
  listeners: number;
  listenersDeltaPct: number;
  completionPct: number;
  completionLabel: 'Low' | 'Average' | 'High';
  playlistAdds: number;
  playlistAddsDelta: number;
  trend: TrendPoint[];
  peak: number;
  peakLabel: string;
  avgListenSec: number;
  avgListenPct: number;
  geography: { city: LocalizedText; country: LocalizedText; pct: number }[];
  channels: { name: LocalizedText; pct: number }[];
};

const PERIOD_POINTS: Record<TimePeriod, number> = { '24h': 6, '7d': 7, '28d': 10, all: 12 };
const PERIOD_BASE: Record<TimePeriod, number> = { '24h': 1200, '7d': 9000, '28d': 42000, all: 180000 };

/** Small, seeded PRNG (mulberry32) — deterministic given the same seed. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(trackId: string, period: TimePeriod): number {
  const s = `${trackId}:${period}`;
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return hash >>> 0;
}

export function getTrackAnalytics(trackId: string, period: TimePeriod): TrackAnalytics {
  const rand = mulberry32(seedFrom(trackId, period));
  const points = PERIOD_POINTS[period];
  const base = PERIOD_BASE[period];

  let trendValue = base * 0.3;
  const trend: TrendPoint[] = Array.from({ length: points }, (_, i) => {
    trendValue = Math.max(10, trendValue + (rand() - 0.35) * base * 0.25);
    return { label: `P${i + 1}`, value: Math.round(trendValue) };
  });
  const peak = Math.max(...trend.map((p) => p.value));

  const streams = Math.round(base * (1.4 + rand() * 0.6));
  const listeners = Math.round(streams * (0.45 + rand() * 0.15));
  const completionPct = Math.round(60 + rand() * 35);
  const playlistAdds = Math.round(streams * 0.02 * (0.5 + rand()));

  const geoRaw = [0.3 + rand() * 0.3, 0.15 + rand() * 0.2, 0.08 + rand() * 0.15];
  const geoSum = geoRaw.reduce((s, v) => s + v, 0);
  const geoPcts = geoRaw.map((v) => Math.round((v / geoSum) * 87));
  const lastGeo = 100 - geoPcts.reduce((s, v) => s + v, 0);

  const chanRaw = [0.4 + rand() * 0.2, 0.2 + rand() * 0.15, 0.1 + rand() * 0.1];
  const chanSum = chanRaw.reduce((s, v) => s + v, 0);
  const chanPcts = chanRaw.map((v) => Math.round((v / chanSum) * 94));
  const lastChan = 100 - chanPcts.reduce((s, v) => s + v, 0);

  return {
    streams,
    streamsDeltaPct: Math.round((8 + rand() * 15) * 10) / 10,
    listeners,
    listenersDeltaPct: Math.round((5 + rand() * 12) * 10) / 10,
    completionPct,
    completionLabel: completionPct >= 80 ? 'High' : completionPct >= 60 ? 'Average' : 'Low',
    playlistAdds,
    playlistAddsDelta: Math.round(playlistAdds * 0.08),
    trend,
    peak,
    peakLabel: trend.find((p) => p.value === peak)?.label ?? trend[trend.length - 1]!.label,
    avgListenSec: Math.round(180 + rand() * 90),
    avgListenPct: Math.round(70 + rand() * 20),
    geography: [
      { city: { en: 'Bishkek', ru: 'Бишкек' }, country: { en: 'Kyrgyzstan', ru: 'Кыргызстан' }, pct: geoPcts[0]! },
      { city: { en: 'Almaty', ru: 'Алматы' }, country: { en: 'Kazakhstan', ru: 'Казахстан' }, pct: geoPcts[1]! },
      { city: { en: 'Osh', ru: 'Ош' }, country: { en: 'Kyrgyzstan', ru: 'Кыргызстан' }, pct: geoPcts[2]! },
      { city: { en: 'Other cities', ru: 'Другие города' }, country: { en: 'Global', ru: 'Глобал' }, pct: lastGeo },
    ],
    channels: [
      { name: { en: 'Mmusic For You', ru: 'Mmusic For You' }, pct: chanPcts[0]! },
      { name: { en: 'Playlists', ru: 'Плейлисты' }, pct: chanPcts[1]! },
      { name: { en: 'Artist Search', ru: 'Поиск артиста' }, pct: chanPcts[2]! },
      { name: { en: 'Track Radio', ru: 'Радио трека' }, pct: lastChan },
    ],
  };
}

/**
 * DEMO ONLY — artist-level totals for the dashboard Overview, derived from the
 * same seeded per-track figures the Analytics tab shows, so the two tabs
 * reconcile: streams = Σ each track's "All time" streams; monthly listeners
 * = Σ each track's 28-day listeners (an upper bound — no real de-duplication).
 */
export function getArtistDemoTotals(trackIds: string[]): { streams: number; monthlyListeners: number } {
  return trackIds.reduce(
    (totals, trackId) => ({
      streams: totals.streams + getTrackAnalytics(trackId, 'all').streams,
      monthlyListeners: totals.monthlyListeners + getTrackAnalytics(trackId, '28d').listeners,
    }),
    { streams: 0, monthlyListeners: 0 },
  );
}
