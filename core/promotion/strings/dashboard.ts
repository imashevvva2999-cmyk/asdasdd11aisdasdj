import type { PromoStringTable } from '../string-table';

type K =
  | 'artistBadge'
  | 'artistMeta'
  | 'helpLabel'
  | 'smartPush'
  | 'audioHub'
  | 'heroTitle'
  | 'heroBodyPrefix'
  | 'heroBodyBrand'
  | 'heroBodySuffix'
  | 'heroCta'
  | 'startFrom'
  | 'perDay'
  | 'summaryTitle'
  | 'updated'
  | 'reachLabel'
  | 'reachDelta'
  | 'fansLabel'
  | 'fansHint'
  | 'rotationLabel'
  | 'campaignWord'
  | 'investLabel'
  | 'currency'
  | 'roi'
  | 'currentTitle'
  | 'onAir'
  | 'streamType'
  | 'campaignId'
  | 'lpSuffix'
  | 'impressions'
  | 'goal'
  | 'progress'
  | 'done'
  | 'remaining'
  | 'finish'
  | 'details'
  | 'pause'
  | 'geoTitle'
  | 'geoTop'
  | 'people'
  | 'historyTitle'
  | 'all'
  | 'budget'
  | 'reachSuffix'
  | 'walletTitle'
  | 'walletHint'
  | 'walletBalance'
  | 'walletTopUp'
  | 'createCta';

/** Stitch screen 1 ("mmusic_studio") copy. RU = export text verbatim. */
export const DashboardPromoStrings = {
  en: {
    artistBadge: 'PRO ARTIST',
    artistMeta: 'Kyrgyzstan & CIS • Smart targeting active',
    helpLabel: 'Campaign help',
    smartPush: 'Smart Push AI',
    audioHub: 'mBank Audio Hub',
    heroTitle: 'Launch your track promotion',
    heroBodyPrefix: 'Reach targeted listeners in Kyrgyzstan and Central Asia through the smart algorithms of the ',
    heroBodyBrand: 'Mmusic',
    heroBodySuffix: ' ecosystem.',
    heroCta: 'Promote music',
    startFrom: 'Starting at',
    perDay: 'сом / day',
    summaryTitle: '30-day summary',
    updated: 'Updated 8m ago',
    reachLabel: 'Audience reach',
    reachDelta: '+24% vs last month',
    fansLabel: 'To fans',
    fansHint: 'saves to library',
    rotationLabel: 'In rotation',
    campaignWord: 'campaign',
    investLabel: 'Investment',
    currency: 'сом',
    roi: 'ROI: +180% streams',
    currentTitle: 'Current campaign',
    onAir: 'ON AIR',
    streamType: 'Electronic smart stream',
    campaignId: 'ID: 884-KY',
    lpSuffix: 'LP "Starlight Drift"',
    impressions: 'impressions',
    goal: 'Goal:',
    progress: 'Rotation progress',
    done: 'done',
    remaining: 'Remaining:',
    finish: 'Finish: Sep 22',
    details: 'Detailed statistics',
    pause: 'Pause campaign',
    geoTitle: 'Listener geography',
    geoTop: 'Bishkek + Osh',
    people: 'people',
    historyTitle: 'Campaign history',
    all: 'All',
    budget: 'Budget',
    reachSuffix: 'reach',
    walletTitle: 'Promo wallet balance',
    walletHint: 'Top up via mBank with no fee',
    walletBalance: '3,850',
    walletTopUp: 'Top up',
    createCta: 'Create new campaign',
  },
  ru: {
    artistBadge: 'PRO ARTIST',
    artistMeta: 'Кыргызстан и СНГ • Смарт-таргет активен',
    helpLabel: 'Справка по кампаниям',
    smartPush: 'Smart Push AI',
    audioHub: 'mBank Audio Hub',
    heroTitle: 'Запустите продвижение трека',
    heroBodyPrefix: 'Привлекайте целевых слушателей в Кыргызстане и Центральной Азии через смарт-алгоритмы экосистемы ',
    heroBodyBrand: 'Mmusic',
    heroBodySuffix: '.',
    heroCta: 'Продвигать музыку',
    startFrom: 'Старт от',
    perDay: 'сом / день',
    summaryTitle: 'Сводка за 30 дней',
    updated: 'Обновлено 8м назад',
    reachLabel: 'Охват аудитории',
    reachDelta: '+24% к прошл. месяцу',
    fansLabel: 'В фаны',
    fansHint: 'сохранения в медиатеку',
    rotationLabel: 'В ротации',
    campaignWord: 'кампания',
    investLabel: 'Инвестиции',
    currency: 'сом',
    roi: 'ROI: +180% стримов',
    currentTitle: 'Текущая кампания',
    onAir: 'В ЭФИРЕ',
    streamType: 'Электронный смарт-поток',
    campaignId: 'ID: 884-KY',
    lpSuffix: 'LP "Starlight Drift"',
    impressions: 'показов',
    goal: 'Цель:',
    progress: 'Прогресс ротации',
    done: 'выполнено',
    remaining: 'Осталось:',
    finish: 'Финиш: 22 сен',
    details: 'Детальная статистика',
    pause: 'Пауза кампании',
    geoTitle: 'География слушателей',
    geoTop: 'Бишкек + Ош',
    people: 'чел',
    historyTitle: 'История кампаний',
    all: 'Все',
    budget: 'Бюджет',
    reachSuffix: 'охват',
    walletTitle: 'Баланс промо-кошелька',
    walletHint: 'Пополняйте через mBank без комиссии',
    walletBalance: '3 850',
    walletTopUp: 'Пополнить',
    createCta: 'Создать новую кампанию',
  },
} satisfies PromoStringTable<K>;
