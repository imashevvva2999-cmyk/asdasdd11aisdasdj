import type { PromoStringTable } from '../string-table';

type K =
  | 'helpToast'
  | 'paused'
  | 'resumed'
  | 'resume'
  | 'resumeDelivery'
  | 'collapse'
  | 'topUpToast'
  | 'inReview'
  | 'albumsEmpty'
  | 'profileToast'
  | 'reportCopied'
  | 'reportShared'
  | 'exported'
  | 'walletAvailablePrefix'
  | 'insufficientWallet'
  | 'cancelPayment'
  | 'paymentCancelled'
  | 'noCampaignTrack'
  | 'currency';

/** Feedback copy for Promotion interactions that have no Stitch text of their own. */
export const InteractionPromoStrings = {
  en: {
    helpToast: 'Pick a track, a package and an audience, then pay via MBANK',
    paused: 'Campaign paused',
    resumed: 'Campaign resumed',
    resume: 'Resume campaign',
    resumeDelivery: 'Resume delivery',
    collapse: 'Collapse',
    topUpToast: 'Wallet top-up will be available once MBANK is connected',
    inReview: 'In review',
    albumsEmpty: 'No albums yet. Your tracks are released as singles.',
    profileToast: 'Profile promotion will be available once the backend is connected',
    reportCopied: 'Report copied to clipboard',
    reportShared: 'Report shared',
    exported: 'Analytics exported as CSV',
    walletAvailablePrefix: 'Available: ',
    insufficientWallet: 'Not enough funds in the promo wallet. Choose MBANK Pay.',
    cancelPayment: 'Cancel payment',
    paymentCancelled: 'Payment cancelled',
    noCampaignTrack: 'Publish a track to manage this campaign',
    currency: 'сом',
  },
  ru: {
    helpToast: 'Выберите трек, пакет и аудиторию, затем оплатите через MBANK',
    paused: 'Кампания приостановлена',
    resumed: 'Кампания возобновлена',
    resume: 'Возобновить кампанию',
    resumeDelivery: 'Возобновить показ',
    collapse: 'Свернуть',
    topUpToast: 'Пополнение станет доступно после подключения MBANK',
    inReview: 'На модерации',
    albumsEmpty: 'Альбомов пока нет. Ваши треки выпущены как синглы.',
    profileToast: 'Продвижение профиля станет доступно после подключения бэкенда',
    reportCopied: 'Отчет скопирован в буфер обмена',
    reportShared: 'Отчет отправлен',
    exported: 'Аналитика выгружена в CSV',
    walletAvailablePrefix: 'Доступно: ',
    insufficientWallet: 'Недостаточно средств на промо-кошельке. Выберите MBANK Pay.',
    cancelPayment: 'Отменить оплату',
    paymentCancelled: 'Оплата отменена',
    noCampaignTrack: 'Опубликуйте трек, чтобы управлять кампанией',
    currency: 'сом',
  },
} satisfies PromoStringTable<K>;
