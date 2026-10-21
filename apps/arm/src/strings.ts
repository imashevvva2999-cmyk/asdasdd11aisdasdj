import type { StringTable } from '@mmusic/backoffice/i18n';

/** ARM page text (RU default, EN). Shell text lives in @mmusic/backoffice. */
export const ARM_STRINGS = {
  ru: {
    dashboardTitle: 'Дашборд',
    dashboardSubtitle: 'Административное рабочее место Mmusic — фундамент (этап M1).',
    catalogTitle: 'Каталог прототипа',
    catalogHint: 'Публичные метаданные демо-каталога приложения (@mmusic/core)',
    artists: 'Артисты',
    albums: 'Альбомы',
    tracks: 'Треки',
    genres: 'Жанры и подборки',
    playlists: 'Плейлисты',
    teamTitle: 'Команда (вымышленные сотрудники)',
    roadmapTitle: 'Что появится дальше',
    roadmapM2: 'M2 — модерация треков и релизов, артисты, пользователи, журнал действий',
    roadmapM3: 'M3 — каталог, проверка кампаний, обзор платежей (только просмотр), отчёты',
    roadmapM6: 'M6 — экран ролей и прав, применение прав к действиям',
  },
  en: {
    dashboardTitle: 'Dashboard',
    dashboardSubtitle: 'Mmusic administration workspace — foundation (milestone M1).',
    catalogTitle: 'Prototype catalog',
    catalogHint: 'Public metadata of the app’s demo catalog (@mmusic/core)',
    artists: 'Artists',
    albums: 'Albums',
    tracks: 'Tracks',
    genres: 'Genres and collections',
    playlists: 'Playlists',
    teamTitle: 'Team (fictional staff)',
    roadmapTitle: 'Coming next',
    roadmapM2: 'M2 — track and release moderation, artists, users, activity log',
    roadmapM3: 'M3 — catalog, campaign review, payments overview (view only), reports',
    roadmapM6: 'M6 — roles and permissions screen, permissions applied to actions',
  },
} as const satisfies StringTable<string>;
