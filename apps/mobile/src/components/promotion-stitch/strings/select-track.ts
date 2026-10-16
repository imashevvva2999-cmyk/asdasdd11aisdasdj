import type { PromoStringTable } from '@/components/promotion-stitch';

type K =
  | 'title'
  | 'step'
  | 'progress'
  | 'subtitle'
  | 'tabTracks'
  | 'tabAlbums'
  | 'tabProfile'
  | 'search'
  | 'clearSearch'
  | 'single'
  | 'artistProfile'
  | 'artistProfileHint'
  | 'selected'
  | 'stepShort'
  | 'continue';

/** Stitch screen 2 "Choose Music To Promote" — RU verbatim from the export. */
export const SelectTrackPromoStrings = {
  en: {
    title: 'Choose Music To Promote',
    step: 'Step 1 of 4',
    progress: '25% done',
    subtitle: 'Choose a track, album or artist profile to set up a targeted campaign.',
    tabTracks: 'Tracks',
    tabAlbums: 'Albums (2)',
    tabProfile: 'Profile',
    search: 'Search the track catalog...',
    clearSearch: 'Clear search',
    single: 'Single',
    artistProfile: 'Artist profile',
    artistProfileHint: 'Promote your whole page and discography',
    selected: 'Selected:',
    stepShort: 'STEP 1/4',
    continue: 'Continue',
  },
  ru: {
    title: 'Choose Music To Promote',
    step: 'Шаг 1 из 4',
    progress: '25% готово',
    subtitle: 'Выберите трек, альбом или профиль артиста для настройки таргетированной кампании.',
    tabTracks: 'Треки',
    tabAlbums: 'Альбомы (2)',
    tabProfile: 'Профиль',
    search: 'Поиск по каталогу треков...',
    clearSearch: 'Очистить поиск',
    single: 'Сингл',
    artistProfile: 'Профиль артиста',
    artistProfileHint: 'Продвижение всей страницы и дискографии',
    selected: 'Выбрано:',
    stepShort: 'ШАГ 1/4',
    continue: 'Продолжить',
  },
} satisfies PromoStringTable<K>;
