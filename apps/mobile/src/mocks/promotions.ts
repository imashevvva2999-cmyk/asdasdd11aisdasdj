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

