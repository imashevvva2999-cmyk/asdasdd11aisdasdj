import { sampleImageChoices } from '@/constants/stitch-artwork';
import { getArtistDemoTotals, getTrackAnalytics } from '@/lib/analytics-mock';
import type { LocalizedText } from '@/lib/dashboard-i18n';

/**
 * DEMO ONLY — one coherent, clearly simulated artist account for the private
 * management demo ("Load demo artist account" on /dev-demo-seed). The artist
 * is fictional. Every listener/stream figure is derived from the same seeded
 * per-track analytics the Analytics tab shows (getArtistDemoTotals), so all
 * four dashboard tabs agree. Nothing here is real telemetry or real money.
 */
export const DEMO_ARTIST_PROFILE = {
  stageName: 'Nomad Echo',
  genre: 'Electronic',
  bio: 'Электронный дуэт из Бишкека: тёплые синтезаторы, комуз и ночные городские ритмы. (Демо-профиль.)',
  location: 'Бишкек, Кыргызстан',
  photoUri: sampleImageChoices[0],
};

export type DemoRelease = { id: string; title: string; durationSec: number; coverUri?: (typeof sampleImageChoices)[number]; daysAgo: number };

export const DEMO_RELEASES: DemoRelease[] = [
  { id: 'demo-release-steppe-lights', title: 'Steppe Lights', durationSec: 214, coverUri: sampleImageChoices[1], daysAgo: 6 },
  { id: 'demo-release-night-osh', title: 'Night Train to Osh', durationSec: 238, coverUri: sampleImageChoices[2], daysAgo: 21 },
  { id: 'demo-release-issyk-blue', title: 'Issyk Blue', durationSec: 197, coverUri: sampleImageChoices[3], daysAgo: 44 },
  { id: 'demo-release-komuz-signal', title: 'Komuz Signal', durationSec: 226, coverUri: sampleImageChoices[4], daysAgo: 73 },
  { id: 'demo-release-ala-too', title: 'Ala-Too Morning', durationSec: 189, coverUri: sampleImageChoices[5], daysAgo: 118 },
];

/** Fan donations RECEIVED by the demo artist (not the listener's own Support History). */
export const DEMO_FAN_DONATIONS: { from: string; amountKgs: number; daysAgo: number }[] = [
  { from: 'Айгерим К.', amountKgs: 500, daysAgo: 0 },
  { from: 'Тимур Б.', amountKgs: 100, daysAgo: 1 },
  { from: 'Aliya S.', amountKgs: 250, daysAgo: 2 },
  { from: 'Нурлан А.', amountKgs: 1000, daysAgo: 4 },
  { from: 'Бекзат Т.', amountKgs: 50, daysAgo: 6 },
  { from: 'Мээрим Ж.', amountKgs: 300, daysAgo: 9 },
];

export const DEMO_AGE_GROUPS = [
  { label: '18–24', pct: 36 },
  { label: '25–34', pct: 39 },
  { label: '35–44', pct: 16 },
  { label: '45+', pct: 9 },
];

export const DEMO_GENDER: { label: LocalizedText; pct: number }[] = [
  { label: { en: 'Women', ru: 'Женщины' }, pct: 54 },
  { label: { en: 'Men', ru: 'Мужчины' }, pct: 44 },
  { label: { en: 'Other / not set', ru: 'Другое / не указано' }, pct: 2 },
];

export const DEMO_TOP_COUNTRIES: { name: LocalizedText; pct: number }[] = [
  { name: { en: 'Kyrgyzstan', ru: 'Кыргызстан' }, pct: 61 },
  { name: { en: 'Kazakhstan', ru: 'Казахстан' }, pct: 17 },
  { name: { en: 'Russia', ru: 'Россия' }, pct: 12 },
  { name: { en: 'Türkiye', ru: 'Турция' }, pct: 5 },
  { name: { en: 'Other', ru: 'Другие' }, pct: 5 },
];

export const DEMO_TOP_CITIES: { name: LocalizedText; pct: number }[] = [
  { name: { en: 'Bishkek', ru: 'Бишкек' }, pct: 38 },
  { name: { en: 'Osh', ru: 'Ош' }, pct: 14 },
  { name: { en: 'Almaty', ru: 'Алматы' }, pct: 11 },
  { name: { en: 'Moscow', ru: 'Москва' }, pct: 8 },
  { name: { en: 'Karakol', ru: 'Каракол' }, pct: 6 },
];

const MONTHS: LocalizedText[] = [
  { en: 'Nov', ru: 'Ноя' }, { en: 'Dec', ru: 'Дек' }, { en: 'Jan', ru: 'Янв' }, { en: 'Feb', ru: 'Фев' },
  { en: 'Mar', ru: 'Мар' }, { en: 'Apr', ru: 'Апр' }, { en: 'May', ru: 'Май' }, { en: 'Jun', ru: 'Июн' },
  { en: 'Jul', ru: 'Июл' }, { en: 'Aug', ru: 'Авг' }, { en: 'Sep', ru: 'Сен' }, { en: 'Oct', ru: 'Окт' },
];

/** Simulated per-stream royalty used for the demo revenue estimate (KGS). */
export const DEMO_ROYALTY_PER_STREAM_KGS = 0.035;

export type DemoAccountMetrics = {
  monthlyListeners: number;
  streams: number;
  followers: number;
  royaltiesKgs: number;
  fanDonationsKgs: number;
  growth: { label: LocalizedText; value: number }[];
  /** Period-over-period growth, weighted across releases by their own
   * streams/listeners — same seeded per-track deltas the Analytics tab shows. */
  streamsDeltaPct: number;
  listenersDeltaPct: number;
};

function weightedAvgPct(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight === 0) return 0;
  const sum = values.reduce((s, v, i) => s + v * weights[i]!, 0);
  return Math.round((sum / totalWeight) * 10) / 10;
}

/** All account-level figures, derived from the demo releases' analytics. */
export function getDemoAccountMetrics(trackIds: string[]): DemoAccountMetrics {
  const { streams, monthlyListeners } = getArtistDemoTotals(trackIds);
  const perTrack28d = trackIds.map((id) => getTrackAnalytics(id, '28d'));
  return {
    monthlyListeners,
    streams,
    followers: Math.round(monthlyListeners * 0.21),
    royaltiesKgs: Math.round(streams * DEMO_ROYALTY_PER_STREAM_KGS),
    fanDonationsKgs: DEMO_FAN_DONATIONS.reduce((sum, d) => sum + d.amountKgs, 0),
    // 12-month listener growth ending at the current monthly listeners.
    growth: MONTHS.map((label, i) => ({ label, value: Math.round(monthlyListeners * (0.32 + 0.68 * Math.pow(i / 11, 1.35))) })),
    streamsDeltaPct: weightedAvgPct(perTrack28d.map((d) => d.streamsDeltaPct), perTrack28d.map((d) => d.streams)),
    listenersDeltaPct: weightedAvgPct(perTrack28d.map((d) => d.listenersDeltaPct), perTrack28d.map((d) => d.listeners)),
  };
}

export const DEMO_RECENT_ACTIVITY: { icon: string; text: LocalizedText; daysAgo: number }[] = [
  { icon: 'volunteer-activism', text: { en: 'Айгерим К. supported you with 500 сом', ru: 'Айгерим К. поддержала вас на 500 сом' }, daysAgo: 0 },
  { icon: 'playlist-add', text: { en: '"Steppe Lights" added to the editorial playlist «Вечерний Бишкек»', ru: '«Steppe Lights» добавлен в редакционный плейлист «Вечерний Бишкек»' }, daysAgo: 1 },
  { icon: 'campaign', text: { en: 'Campaign for "Night Train to Osh" passed 70% of its goal', ru: 'Кампания «Night Train to Osh» выполнила 70% цели' }, daysAgo: 2 },
  { icon: 'groups', text: { en: '+1,240 new followers this week', ru: '+1 240 новых подписчиков за неделю' }, daysAgo: 3 },
  { icon: 'upload', text: { en: '"Steppe Lights" was published', ru: '«Steppe Lights» опубликован' }, daysAgo: 6 },
];
