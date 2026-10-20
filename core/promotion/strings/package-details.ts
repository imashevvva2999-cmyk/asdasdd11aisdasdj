import type { PromoStringTable } from '../string-table';

type Key =
  | 'badge'
  | 'packagePrefix'
  | 'titleSuffix'
  | 'close'
  | 'investment'
  | 'free'
  | 'daysSuffix'
  | 'noLimit'
  | 'currency'
  | 'selectedTrack'
  | 'change'
  | 'featuresTitle'
  | 'forecastTitle'
  | 'aiSimulation'
  | 'reachLabel'
  | 'reachUnit'
  | 'streamsLabel'
  | 'streamsUnit'
  | 'followersLabel'
  | 'followersUnit'
  | 'disclaimer'
  | 'termsTitle'
  | 'secureTitle'
  | 'secureBody'
  | 'controlTitle'
  | 'controlBody'
  | 'selectFor'
  | 'nextStep';

/** Stitch screen 4 "Package details" bottom sheet copy (RU = export verbatim). */
export const PackageDetailsPromoStrings = {
  en: {
    badge: 'Spotlight',
    packagePrefix: 'Package',
    titleSuffix: '— Promotion',
    close: 'Close dialog',
    investment: 'Track investment',
    free: 'Free',
    daysSuffix: 'days',
    noLimit: 'no time limit',
    currency: 'сом',
    selectedTrack: 'Selected track',
    change: 'Change',
    featuresTitle: 'Features & benefits',
    forecastTitle: 'Performance forecast',
    aiSimulation: 'AI simulation',
    reachLabel: 'Reach',
    reachUnit: 'impressions',
    streamsLabel: 'Streams',
    streamsUnit: 'plays',
    followersLabel: 'Followers',
    followersUnit: 'to library',
    disclaimer: 'Actual results depend on how appealing the track is, the hook in the first 10 seconds and the audience response.',
    termsTitle: 'Terms & guarantees',
    secureTitle: 'Secure transactions',
    secureBody: 'Instant acquiring via MBANK, Elcard and Visa',
    controlTitle: 'Full budget control',
    controlBody: 'Pause or resume delivery in one tap',
    selectFor: 'Select package for',
    nextStep: 'Step 3: Targeting setup →',
  },
  ru: {
    badge: 'Spotlight',
    packagePrefix: 'Пакет',
    titleSuffix: '— Продвижение',
    close: 'Закрыть модальное окно',
    investment: 'Инвестиция в трек',
    free: 'Бесплатно',
    daysSuffix: 'дней',
    noLimit: 'без ограничений',
    currency: 'сом',
    selectedTrack: 'Выбранный трек',
    change: 'Сменить',
    featuresTitle: 'Характеристики и преимущества',
    forecastTitle: 'Прогноз эффективности',
    aiSimulation: 'AI Симуляция',
    reachLabel: 'Охват',
    reachUnit: 'показов',
    streamsLabel: 'Стримы',
    streamsUnit: 'прослушиваний',
    followersLabel: 'Фоловеры',
    followersUnit: 'в медиатеку',
    disclaimer: 'Фактические результаты зависят от привлекательности композиции, хука в первые 10 секунд и отклика аудитории.',
    termsTitle: 'Условия и гарантии',
    secureTitle: 'Защищенные транзакции',
    secureBody: 'Мгновенный эквайринг через MBANK, Элкарт и Visa',
    controlTitle: 'Полный контроль баланса',
    controlBody: 'Останавливайте или возобновляйте показ в 1 клик',
    selectFor: 'Выбрать пакет за',
    nextStep: 'Шаг 3: Настройка параметров таргетинга →',
  },
} satisfies PromoStringTable<Key>;
