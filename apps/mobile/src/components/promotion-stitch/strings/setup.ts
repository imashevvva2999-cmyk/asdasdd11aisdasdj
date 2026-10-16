import type { PromoStringTable } from '@/components/promotion-stitch';

type K =
  | 'title'
  | 'step'
  | 'stepCaption'
  | 'intro'
  | 'readyToLaunch'
  | 'tariff'
  | 'days'
  | 'currency'
  | 'change'
  | 'geoTitle'
  | 'geoCountry'
  | 'geoAll'
  | 'geoAllHint'
  | 'geoBishkek'
  | 'geoBishkekHint'
  | 'geoBishkekOsh'
  | 'geoBishkekOshHint'
  | 'geoManual'
  | 'geoManualHint'
  | 'includedTitle'
  | 'includedAll'
  | 'includedBishkek'
  | 'includedBishkekOsh'
  | 'includedManual'
  | 'ageTitle'
  | 'ageBadge'
  | 'ageAll'
  | 'ageMin'
  | 'ageRange'
  | 'ageMax'
  | 'ageNote'
  | 'genresTitle'
  | 'genresIntro'
  | 'forecastTitle'
  | 'liveAi'
  | 'forecastCaption'
  | 'relevance'
  | 'relevanceHint'
  | 'excellent'
  | 'total'
  | 'showDays'
  | 'perImpression'
  | 'cta';

export const SetupPromoStrings = {
  ru: {
    title: 'Campaign Setup',
    step: 'Шаг 3 из 4',
    stepCaption: 'Настройка таргетинга',
    intro: 'Задайте параметры аудитории для максимально точного показа трека в алгоритмических рекомендациях.',
    readyToLaunch: 'Готов к запуску',
    tariff: 'Тариф',
    days: 'дней',
    currency: 'сом',
    change: 'Изменить',
    geoTitle: 'География показа',
    geoCountry: 'Кыргызстан',
    geoAll: 'Вся страна',
    geoAllHint: 'Все 7 областей',
    geoBishkek: 'Только Бишкек',
    geoBishkekHint: 'Столичный кластер',
    geoBishkekOsh: 'Бишкек и Ош',
    geoBishkekOshHint: 'Крупнейшие хабы',
    geoManual: 'Вручную',
    geoManualHint: 'Выбрать регионы',
    includedTitle: 'Включенные локации:',
    includedAll: 'Бишкек, Ош, Джалал-Абад, Каракол, Нарын, Талас, Баткен и пригороды.',
    includedBishkek: 'Бишкек и пригороды.',
    includedBishkekOsh: 'Бишкек, Ош и их пригороды.',
    includedManual: 'Регионы, выбранные вручную.',
    ageTitle: 'Возраст слушателей',
    ageBadge: '18 — 35 лет (ядро стриминга)',
    ageAll: 'Все возрасты',
    ageMin: '14 лет',
    ageRange: '18 — 35 лет',
    ageMax: '65+ лет',
    ageNote: '78% слушателей электроники и чиллаута в Кыргызстане входят в этот диапазон.',
    genresTitle: 'Жанры и предпочтения',
    genresIntro: 'Слушатели с похожими вкусами первыми услышат трек в умных рекомендациях.',
    forecastTitle: 'Прогноз охвата',
    liveAi: 'Live AI',
    forecastCaption: 'гарантированных целевых показов трека',
    relevance: '94% релевантность аудитории',
    relevanceHint: 'Минимальный риск пропусков',
    excellent: 'ОТЛИЧНО',
    total: 'Итого за кампанию',
    showDays: 'дней показа',
    perImpression: 'сом / показ',
    cta: 'Перейти к оплате',
  },
  en: {
    title: 'Campaign Setup',
    step: 'Step 3 of 4',
    stepCaption: 'Targeting setup',
    intro: 'Set your audience parameters for the most precise placement of your track in algorithmic recommendations.',
    readyToLaunch: 'Ready to launch',
    tariff: 'Plan',
    days: 'days',
    currency: 'сом',
    change: 'Change',
    geoTitle: 'Reach geography',
    geoCountry: 'Kyrgyzstan',
    geoAll: 'Whole country',
    geoAllHint: 'All 7 regions',
    geoBishkek: 'Bishkek only',
    geoBishkekHint: 'Capital cluster',
    geoBishkekOsh: 'Bishkek & Osh',
    geoBishkekOshHint: 'Largest hubs',
    geoManual: 'Manual',
    geoManualHint: 'Pick regions',
    includedTitle: 'Included locations:',
    includedAll: 'Bishkek, Osh, Jalal-Abad, Karakol, Naryn, Talas, Batken and suburbs.',
    includedBishkek: 'Bishkek and suburbs.',
    includedBishkekOsh: 'Bishkek, Osh and their suburbs.',
    includedManual: 'Manually selected regions.',
    ageTitle: 'Listener age',
    ageBadge: '18 — 35 y.o. (streaming core)',
    ageAll: 'All ages',
    ageMin: '14 y.o.',
    ageRange: '18 — 35 y.o.',
    ageMax: '65+ y.o.',
    ageNote: '78% of electronic and chillout listeners in Kyrgyzstan fall into this range.',
    genresTitle: 'Genres & preferences',
    genresIntro: 'Listeners with similar tastes will hear the track first in smart recommendations.',
    forecastTitle: 'Reach forecast',
    liveAi: 'Live AI',
    forecastCaption: 'guaranteed targeted track impressions',
    relevance: '94% audience relevance',
    relevanceHint: 'Minimal risk of misses',
    excellent: 'EXCELLENT',
    total: 'Campaign total',
    showDays: 'days of delivery',
    perImpression: 'сом / impression',
    cta: 'Proceed to payment',
  },
} satisfies PromoStringTable<K>;
