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
};

export const ACTIVE_CAMPAIGN: ActiveCampaign = {
  trackId: 'midnight-mirage',
  dayOfTotal: { en: 'Day 4 of 10', ru: 'День 4 из 10' },
  reach: 12400,
  reachGoal: 25000,
  conversionRatePct: 8.4,
  newFollowers: 1041,
  progressPct: 49.6,
};

export type CampaignHistoryEntry = { id: string; trackTitle: string; metric: LocalizedText; completedLabel: LocalizedText; reach: number };

export const CAMPAIGN_HISTORY: CampaignHistoryEntry[] = [
  {
    id: 'hist-vapor-trails',
    trackTitle: 'Vapor Trails',
    metric: { en: '+42% streams', ru: '+42% стримов' },
    completedLabel: { en: 'Completed Apr 28 · 10 days', ru: 'Завершена 28 апр · 10 дней' },
    reach: 34800,
  },
  {
    id: 'hist-horizon',
    trackTitle: 'Horizon (album)',
    metric: { en: '+1,850 fans', ru: '+1 850 фанатов' },
    completedLabel: { en: 'Completed Mar 14 · 14 days', ru: 'Завершена 14 мар · 14 дней' },
    reach: 52100,
  },
];
