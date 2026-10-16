import type { PromoStringTable } from '@/components/promotion-stitch';

type K =
  | 'campaignPrefix'
  | 'share'
  | 'export'
  | 'live'
  | 'impressionsOf'
  | 'budgetSuffix'
  | 'remaining'
  | 'until'
  | 'active'
  | 'trackImpressions'
  | 'promoListeners'
  | 'playlistSaves'
  | 'top5'
  | 'profileVisits'
  | 'today38'
  | 'dynamicsTitle'
  | 'perDay'
  | 'dynamicsSubtitle'
  | 'tabImpressions'
  | 'tabStreams'
  | 'tabConversion'
  | 'peak'
  | 'day1'
  | 'day2'
  | 'day3'
  | 'today'
  | 'geoTitle'
  | 'country'
  | 'topLocations'
  | 'ageSlice'
  | 'age1824'
  | 'age2534'
  | 'manageTitle'
  | 'extend'
  | 'editAudience'
  | 'pause'
  | 'sparkCaption'
  | 'sparkEmpty';

export const StatisticsPromoStrings = {
  en: {
    campaignPrefix: 'Campaign',
    share: 'Share report',
    export: 'Export analytics',
    live: 'LIVE',
    impressionsOf: 'impressions',
    budgetSuffix: 'of budget',
    remaining: '{n} days left',
    until: '(until {date})',
    active: 'Active',
    trackImpressions: 'Track impressions',
    promoListeners: 'Promo listeners',
    playlistSaves: 'Playlist saves',
    top5: 'Top 5%',
    profileVisits: 'To artist profile',
    today38: '+38 today',
    dynamicsTitle: 'Campaign dynamics',
    perDay: '~3,900 / day',
    dynamicsSubtitle: 'Impressions and organic plays',
    tabImpressions: 'Impressions',
    tabStreams: 'Streams',
    tabConversion: 'Conversion',
    peak: 'PEAK 4.8K',
    day1: 'Day 1',
    day2: 'Day 2',
    day3: 'Day 3',
    today: 'Today (D4)',
    geoTitle: 'Geography & audience',
    country: 'Kyrgyzstan',
    topLocations: 'Top delivery locations',
    ageSlice: 'Age breakdown',
    age1824: '18–24 y/o',
    age2534: '25–34 y/o',
    manageTitle: 'Campaign management',
    extend: 'Extend campaign with 10% off',
    editAudience: 'Edit audience settings',
    pause: 'Pause delivery',
    sparkCaption: 'Impressions / day',
    sparkEmpty: 'No delivery yet',
  },
  ru: {
    campaignPrefix: 'Кампания',
    share: 'Поделиться отчетом',
    export: 'Экспорт аналитики',
    live: 'В ЭФИРЕ',
    impressionsOf: 'показов',
    budgetSuffix: 'бюджета',
    remaining: 'Осталось {n} дней',
    until: '(до {date})',
    active: 'Активна',
    trackImpressions: 'Показы трека',
    promoListeners: 'Слушатели промо',
    playlistSaves: 'Сохранения в плейлисты',
    top5: 'Топ 5%',
    profileVisits: 'В профиль артиста',
    today38: '+38 сегодня',
    dynamicsTitle: 'Динамика кампании',
    perDay: '~3 900 / день',
    dynamicsSubtitle: 'Показы и органические прослушивания',
    tabImpressions: 'Показы',
    tabStreams: 'Стримы',
    tabConversion: 'Конверсия',
    peak: 'ПИК 4.8K',
    day1: 'День 1',
    day2: 'День 2',
    day3: 'День 3',
    today: 'Сегодня (Д4)',
    geoTitle: 'География и аудитория',
    country: 'Кыргызстан',
    topLocations: 'Топ локаций показа',
    ageSlice: 'Возрастной срез',
    age1824: '18–24 года',
    age2534: '25–34 года',
    manageTitle: 'Управление кампанией',
    extend: 'Продлить кампанию со скидкой 10%',
    editAudience: 'Изменить параметры аудитории',
    pause: 'Приостановить показ',
    sparkCaption: 'Показы / день',
    sparkEmpty: 'Показов пока нет',
  },
} satisfies PromoStringTable<K>;
