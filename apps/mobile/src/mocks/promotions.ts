import type { LocalizedText } from '@/lib/dashboard-i18n';

/**
 * Mock Promotion data (Artist Dashboard, Stitch "mmusic_boost"). No real
 * campaigns exist — launching one is explicitly disabled in the UI.
 */
export type PromoTool = { id: string; name: LocalizedText; priceLabel: LocalizedText; description: LocalizedText; badge?: LocalizedText };

export const PROMO_TOOLS: PromoTool[] = [
  {
    id: 'recommendation-boost',
    name: { en: 'Recommendation Boost', ru: 'Рекомендательный Буст' },
    priceLabel: { en: 'From 1,500 сом', ru: 'От 1 500 сом' },
    description: {
      en: 'Priority placement in For You, New Releases, and Artist Radio mixes. AI targeting with high engagement.',
      ru: 'Приоритетный показ в «Для вас», «Радар новинок» и волнах артистов. AI-таргетинг с высокой вовлечённостью.',
    },
    badge: { en: '3 formats', ru: '3 формата' },
  },
  {
    id: 'editorial-pitch',
    name: { en: 'Editorial Pitch', ru: 'Питчинг в Редакцию' },
    priceLabel: { en: '2 slots', ru: '2 слота' },
    description: {
      en: 'Direct submission to curators: Top Kyrgyzstan, Electronic Chill, Evening Bishkek, and regional playlists.',
      ru: 'Прямая отправка кураторам: «Топ Кыргызстан», «Electronic Chill», «Вечерний Бишкек» и региональные подборки.',
    },
  },
  {
    id: 'home-banner',
    name: { en: 'Home & Stories Banner', ru: 'Баннер на Главной и в Stories' },
    priceLabel: { en: 'Premium', ru: 'Премиум' },
    description: {
      en: 'Exclusive hero visual in the app and a full-screen announcement in Stories, up to 180,000 impressions.',
      ru: 'Эксклюзивный заглавный визуал в приложении и полноэкранный анонс в Stories, до 180 000 показов.',
    },
    badge: { en: 'Premium', ru: 'Премиум' },
  },
];

export type ActiveCampaign = {
  trackId: string;
  dayOfTotal: LocalizedText;
  reach: number;
  reachGoal: number;
  conversionRatePct: number;
  newFollowers: number;
  progressPct: number;
  geoBreakdown?: { regionLabel: LocalizedText; pct: number; count: number }[];
  playlistSaves?: number;
  profileVisits?: number;
};

export const ACTIVE_CAMPAIGN: ActiveCampaign = {
  trackId: 'midnight-mirage',
  dayOfTotal: { en: 'Day 4 of 10', ru: 'День 4 из 10' },
  reach: 12400,
  reachGoal: 25000,
  conversionRatePct: 8.4,
  newFollowers: 1041,
  progressPct: 49.6,
  geoBreakdown: [
    { regionLabel: { en: 'Bishkek (capital & clubs)', ru: 'Бишкек (Столица и клубы)' }, pct: 42, count: 5208 },
    { regionLabel: { en: 'Osh & southern region', ru: 'Ош и Южный регион' }, pct: 26, count: 3224 },
    { regionLabel: { en: 'Almaty & Astana (recommended feed)', ru: 'Алматы и Астана (Реком. фид)' }, pct: 19, count: 2356 },
  ],
  playlistSaves: 412,
  profileVisits: 198,
};

export type CampaignHistoryEntry = {
  id: string;
  trackTitle: string;
  metric: LocalizedText;
  completedLabel: LocalizedText;
  reach: number;
  budgetKgs?: number;
  formatBadge?: LocalizedText;
  /** Promoted track, when it is in the current artist's catalog. */
  trackId?: string;
  /** ISO date the campaign finished (used to window attributed streams). */
  endedAt?: string;
};

export const CAMPAIGN_HISTORY: CampaignHistoryEntry[] = [
  {
    id: 'hist-vapor-trails',
    trackTitle: 'Vapor Trails',
    metric: { en: '+42% streams', ru: '+42% стримов' },
    completedLabel: { en: 'Completed Apr 28 · 10 days', ru: 'Завершена 28 апр · 10 дней' },
    reach: 34800,
    budgetKgs: 900,
    formatBadge: { en: 'Single', ru: 'Сингл' },
  },
  {
    id: 'hist-horizon',
    trackTitle: 'Horizon (album)',
    metric: { en: '+1,850 fans', ru: '+1 850 фанатов' },
    completedLabel: { en: 'Completed Mar 14 · 14 days', ru: 'Завершена 14 мар · 14 дней' },
    reach: 52100,
    budgetKgs: 1200,
    formatBadge: { en: 'Album', ru: 'Релиз' },
  },
];

export type PromoPackage = {
  id: 'start' | 'boost' | 'pro' | 'spotlight';
  name: string;
  badge?: LocalizedText;
  priceKgs: number;
  durationDays: number;
  forecastLabel: LocalizedText;
  forecastLow: number;
  forecastHigh: number;
  perDayLabel?: LocalizedText;
  features: LocalizedText[];
  /** The one "recommended" tier (red accent) — reserve for exactly one package. */
  highlighted?: boolean;
  /** The flagship/exclusive tier (gold accent) — distinct from `highlighted`
   * so two tiers never compete for the same red "recommended" signal. */
  premium?: boolean;
};

/**
 * Promotion package tiers (Stitch "Choose Promotion Package", Artist
 * Promotion flow). A separate axis from PROMO_TOOLS (thematic boost types,
 * shown nowhere else) — these are the 4 priced plans a campaign is actually
 * launched under. Forecast ranges are explicitly framed as illustrative in
 * the UI copy (the Stitch design's own disclaimer), never a guarantee.
 */
export const PROMO_PACKAGES: PromoPackage[] = [
  {
    id: 'start',
    name: 'START',
    badge: { en: 'Basic start', ru: 'Базовый старт' },
    priceKgs: 0,
    durationDays: 0,
    forecastLabel: { en: 'Standard release stats in Mmusic Studio', ru: 'Стандартная статистика релизов в Mmusic Studio' },
    forecastLow: 0,
    forecastHigh: 0,
    features: [
      { en: 'Basic inclusion in algorithmic search', ru: 'Базовое попадание в алгоритмический поиск' },
      { en: 'Organic distribution across playlists', ru: 'Органическая дистрибуция по плейлистам' },
      { en: 'Standard release stats in Mmusic Studio', ru: 'Стандартная статистика релизов в Mmusic Studio' },
    ],
  },
  {
    id: 'boost',
    name: 'BOOST',
    badge: { en: 'Popular choice', ru: 'Популярный выбор' },
    priceKgs: 500,
    durationDays: 7,
    forecastLabel: { en: '~8,000 – 12,000 impressions', ru: '~8 000 – 12 000 показов' },
    forecastLow: 8000,
    forecastHigh: 12000,
    perDayLabel: { en: '71 сом / day', ru: '71 сом / день' },
    features: [
      { en: 'Priority placement in "Fresh Releases"', ru: 'Приоритет в разделе «Свежие релизы»' },
      { en: "Targeting by your listeners' 3 favorite genres", ru: 'Таргетинг по 3 любимым жанрам слушателей' },
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    badge: { en: 'Best for a single', ru: 'Оптимальный для сингла' },
    priceKgs: 900,
    durationDays: 14,
    forecastLabel: { en: '~20,000 – 30,000 impressions', ru: '~20 000 – 30 000 показов' },
    forecastLow: 20000,
    forecastHigh: 30000,
    perDayLabel: { en: '64 сом / day', ru: '64 сом / день' },
    features: [
      { en: 'High weight in algorithmic "For You" mixes', ru: 'Высокий вес в алгоритмических миксах «For You»' },
      { en: 'Targeting by city: Bishkek, Osh, Jalal-Abad', ru: 'Таргетинг по городам: Бишкек, Ош, Джалал-Абад' },
      { en: 'Extended save-to-library conversion analytics', ru: 'Расширенная аналитика конверсий в сохранения' },
    ],
    highlighted: true,
  },
  {
    id: 'spotlight',
    name: 'SPOTLIGHT',
    badge: { en: 'Flagship campaign tier', ru: 'Хит флагманской кампании' },
    priceKgs: 1300,
    durationDays: 30,
    forecastLabel: { en: '50,000 – 75,000 impressions', ru: '50 000 – 75 000 показов' },
    forecastLow: 50000,
    forecastHigh: 75000,
    perDayLabel: { en: '43 сом / day', ru: '43 сом / день' },
    features: [
      { en: 'Highest priority across all Mmusic recommendations', ru: 'Наивысший приоритет во всех рекомендациях Mmusic' },
      { en: 'Exclusive rotation in home page promo blocks', ru: 'Эксклюзивная ротация в промо-блоках на главной странице' },
      { en: 'Deep socio-demographic listener profile', ru: 'Глубокий социо-демографический портрет слушателя' },
    ],
    premium: true,
  },
];
