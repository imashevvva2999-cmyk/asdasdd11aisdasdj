import type { PromoStringTable } from '../string-table';

type K =
  | 'title'
  | 'step'
  | 'stepSection'
  | 'subtitle'
  | 'change'
  | 'currency'
  | 'forecastPrefix'
  | 'badgeStart'
  | 'badgeBoost'
  | 'badgePro'
  | 'badgeSpotlight'
  | 'termStart'
  | 'termBoost'
  | 'termPro'
  | 'termSpotlight'
  | 'free'
  | 'proDiscount'
  | 'linkStart'
  | 'linkBoost'
  | 'linkPro'
  | 'linkSpotlight'
  | 'topTier'
  | 'spotlightPush';

export const SelectPackagePromoStrings = {
  en: {
    title: 'Choose Promotion Package',
    step: 'Step 2 of 4',
    stepSection: 'Plans',
    subtitle: 'Help your music find new listeners on Mmusic',
    change: 'Change',
    currency: 'som',
    forecastPrefix: 'Forecast:',
    badgeStart: 'Basic start',
    badgeBoost: 'Popular choice',
    badgePro: 'Best for a single',
    badgeSpotlight: 'Hit • Maximum',
    termStart: 'Term: Unlimited',
    termBoost: 'Term: 7 days',
    termPro: 'Term: 14 days',
    termSpotlight: 'Term: 30-day flagship campaign',
    free: 'Free',
    proDiscount: '-15%',
    linkStart: 'Package details',
    linkBoost: 'Launch settings',
    linkPro: 'Full terms',
    linkSpotlight: 'Set up target audience',
    topTier: 'TOP tier',
    spotlightPush: 'Push notification to followers of related artists',
  },
  ru: {
    title: 'Choose Promotion Package',
    step: 'Шаг 2 из 4',
    stepSection: 'Тарифы',
    subtitle: 'Помогите своей музыке найти новых слушателей в Mmusic',
    change: 'Изменить',
    currency: 'сом',
    forecastPrefix: 'Прогноз:',
    badgeStart: 'Базовый старт',
    badgeBoost: 'Популярный выбор',
    badgePro: 'Оптимальный для сингла',
    badgeSpotlight: 'ХИТ • МАКСИМУМ',
    termStart: 'Срок: Без ограничений',
    termBoost: 'Срок: 7 дней',
    termPro: 'Срок: 14 дней',
    termSpotlight: 'Срок: 30 дней флагманской кампании',
    free: 'Бесплатно',
    proDiscount: '-15%',
    linkStart: 'Подробнее о пакете',
    linkBoost: 'Параметры запуска',
    linkPro: 'Подробные условия',
    linkSpotlight: 'Настроить целевую аудиторию',
    topTier: 'TOP tier',
    spotlightPush: 'Push-уведомление подписчикам смежных артистов',
  },
} satisfies PromoStringTable<K>;
