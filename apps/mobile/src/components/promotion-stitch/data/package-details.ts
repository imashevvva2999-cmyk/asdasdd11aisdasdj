import type { LocalizedText } from '@/lib/dashboard-i18n';
import type { PromoPackage } from '@/mocks/promotions';

export type PackageDetailFeature = { title: LocalizedText; body: LocalizedText };

export type PackageDetail = {
  features: PackageDetailFeature[];
  /** Footer line of the hero price card (local_fire_department). */
  popularity: LocalizedText;
  roi: string;
  /** "Прогноз эффективности" stream/follower ranges (reach comes from PROMO_PACKAGES). */
  streams: string;
  followers: string;
};

/** Stitch screen 4 shows the PRO sheet; its copy is verbatim below. The other
 * tiers follow the same structure, written from their PROMO_PACKAGES features. */
export const PACKAGE_DETAILS: Record<PromoPackage['id'], PackageDetail> = {
  start: {
    features: [
      {
        title: { en: 'Algorithmic search', ru: 'Базовое попадание в поиск' },
        body: { en: 'Your track is indexed in Mmusic algorithmic search without extra priority.', ru: 'Трек индексируется в алгоритмическом поиске Mmusic без дополнительного приоритета.' },
      },
      {
        title: { en: 'Organic distribution', ru: 'Органическая дистрибуция' },
        body: { en: 'The track enters playlists as listening grows naturally.', ru: 'Трек попадает в плейлисты по мере естественного роста прослушиваний.' },
      },
      {
        title: { en: 'Standard statistics', ru: 'Стандартная статистика' },
        body: { en: 'Core release metrics are available in Mmusic Studio.', ru: 'Базовые метрики релиза доступны в Mmusic Studio.' },
      },
    ],
    popularity: { en: 'A free start for every release', ru: 'Бесплатный старт для каждого релиза' },
    roi: 'ROI —',
    streams: '—',
    followers: '—',
  },
  boost: {
    features: [
      {
        title: { en: 'Priority in "Fresh Releases"', ru: 'Приоритет в «Свежих релизах»' },
        body: { en: 'Your track is raised higher in the new-releases section for 7 days.', ru: 'Трек поднимается выше в разделе новинок на 7 дней.' },
      },
      {
        title: { en: 'Genre targeting', ru: 'Жанровый таргетинг' },
        body: { en: 'Shown to listeners of the three genres closest to your sound.', ru: 'Показ слушателям трёх самых близких по вкусу жанров.' },
      },
    ],
    popularity: { en: 'Popular choice among new artists', ru: 'Популярный выбор новых артистов' },
    roi: 'ROI x2.1',
    streams: '0.9K-1.5K',
    followers: '+60-120',
  },
  pro: {
    features: [
      {
        title: { en: 'Algorithmic priority: High', ru: 'Алгоритмический приоритет: Высокий' },
        body: {
          en: 'Inclusion in personal "For You" recommendations with a high relevance index.',
          ru: 'Включение в персональные рекомендации пользователей раздела «For You» с высоким индексом релевантности.',
        },
      },
      {
        title: { en: 'Key placements', ru: 'Ключевые плейсменты показа' },
        body: {
          en: 'Hot releases feed, autoplay after similar artists and the premium "You might like" block.',
          ru: 'Лента горячих релизов, авто-воспроизведение после похожих исполнителей и премиальный блок «Вам понравится».',
        },
      },
      {
        title: { en: 'Local geo-targeting', ru: 'Локальный гео-таргетинг' },
        body: {
          en: "Kyrgyzstan: Bishkek, Osh, Jalal-Abad and regional centres, adapted to the audience's language preferences.",
          ru: 'Кыргызстан: Бишкек, Ош, Джалал-Абад и областные центры с адаптацией под языковые предпочтения аудитории.',
        },
      },
      {
        title: { en: 'Deep live analytics', ru: 'Глубокая живая аналитика' },
        body: {
          en: 'Up-to-100% completion metrics, artist profile visits, personal playlist adds and shares.',
          ru: 'Метрики дослушивания до 100%, переходы в профиль артиста, добавления в персональные плейлисты и шейры.',
        },
      },
    ],
    popularity: { en: 'Chosen by 73% of artists this week', ru: 'Выбор 73% артистов недели' },
    roi: 'ROI x3.4',
    streams: '2.4K-3.8K',
    followers: '+180-320',
  },
  spotlight: {
    features: [
      {
        title: { en: 'Top priority', ru: 'Наивысший приоритет' },
        body: { en: 'Maximum weight across all Mmusic recommendations for 30 days.', ru: 'Максимальный вес во всех рекомендациях Mmusic на 30 дней.' },
      },
      {
        title: { en: 'Home page rotation', ru: 'Ротация на главной' },
        body: { en: 'Exclusive promo blocks on the app home page.', ru: 'Эксклюзивные промо-блоки на главной странице приложения.' },
      },
      {
        title: { en: 'Listener portrait', ru: 'Портрет слушателя' },
        body: { en: 'A deep socio-demographic report on the campaign audience.', ru: 'Глубокий социо-демографический отчёт по аудитории кампании.' },
      },
    ],
    popularity: { en: 'Flagship format for big releases', ru: 'Флагманский формат для больших релизов' },
    roi: 'ROI x4.8',
    streams: '6.1K-9.2K',
    followers: '+450-780',
  },
};
