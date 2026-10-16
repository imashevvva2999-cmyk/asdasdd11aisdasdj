import type { PromoStringTable } from '@/components/promotion-stitch';

type K =
  | 'releaseHub'
  | 'close'
  | 'title'
  | 'bodyBefore'
  | 'bodyAfter'
  | 'moderation'
  | 'moderationEta'
  | 'campaign'
  | 'tariff'
  | 'rotationDays'
  | 'payment'
  | 'start'
  | 'startValue'
  | 'nextTitle'
  | 'step1Before'
  | 'step1Accent'
  | 'step2Before'
  | 'step2Accent'
  | 'step2After'
  | 'step3Before'
  | 'step3Accent'
  | 'viewAnalytics'
  | 'backToDashboard';

/** Stitch screen 7 ("Продвижение создано!") copy. */
export const SuccessPromoStrings = {
  en: {
    releaseHub: 'Release Hub',
    close: 'Close',
    title: 'Promotion created!',
    bodyBefore: 'Your campaign for',
    bodyAfter: 'was submitted successfully and is getting ready to launch.',
    moderation: 'In review',
    moderationEta: 'up to 2 hours',
    campaign: 'Campaign',
    tariff: 'Plan',
    rotationDays: 'days of rotation',
    payment: 'Payment',
    start: 'Delivery start',
    startValue: 'Today after review',
    nextTitle: 'What happens next?',
    step1Before: 'Smart algorithms will distribute the track across playlists and the personal feed',
    step1Accent: '“For You”',
    step2Before: 'You’ll get a',
    step2Accent: 'push notification',
    step2After: 'when the first active impressions start.',
    step3Before: 'Detailed first-day analytics will appear in Studio in',
    step3Accent: '6 hours',
    viewAnalytics: 'View campaign analytics',
    backToDashboard: 'Back to Studio Dashboard',
  },
  ru: {
    releaseHub: 'Release Hub',
    close: 'Закрыть',
    title: 'Продвижение создано!',
    bodyBefore: 'Ваша кампания для трека',
    bodyAfter: 'успешно отправлена и готовится к запуску.',
    moderation: 'На модерации',
    moderationEta: 'до 2 часов',
    campaign: 'Кампания',
    tariff: 'Тариф',
    rotationDays: 'дней ротации',
    payment: 'Оплата',
    start: 'Старт показа',
    startValue: 'Сегодня после проверки',
    nextTitle: 'Что происходит дальше?',
    step1Before: 'Смарт-алгоритмы распределят трек по плейлистам и персональной ленте',
    step1Accent: '«For You»',
    step2Before: 'Вы получите',
    step2Accent: 'Push-уведомление',
    step2After: 'в момент старта первых активных показов.',
    step3Before: 'Детальная аналитика первого дня появится в Studio через',
    step3Accent: '6 часов',
    viewAnalytics: 'Посмотреть аналитику кампании',
    backToDashboard: 'Вернуться в Studio Dashboard',
  },
} satisfies PromoStringTable<K>;
