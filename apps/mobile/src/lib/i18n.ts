/**
 * App-wide EN/RU strings (Settings > App Language). Dependency-free — same
 * `t(key)` shape as the existing Dashboard-scoped table (src/lib/dashboard-i18n.ts),
 * which stays separate and untouched (its own screens already import it
 * directly; no need to merge two already-working tables). A future i18next
 * migration (docs/mmusic-task-tracker.md H-1) can drop in without changing
 * call sites on either table.
 *
 * Scope: navigation chrome, Player controls, Profile Hub, Settings, and the
 * Home/Search/Library headers, empty states and primary actions. Track/album/
 * artist/playlist titles and lyrics are DATA, not UI copy, and are never
 * looked up here — same principle the Dashboard table already established.
 */
const EN_STRINGS = {
  // Navigation
  homeTab: 'Home',
  searchTab: 'Search',
  libraryTab: 'Library',

  // Profile stack header titles (src/app/profile/_layout.tsx)
  profileTitle: 'Profile',
  settingsTitle: 'Settings',
  becomeArtistTitle: 'Become An Artist',
  artistSetupTitle: 'Artist Setup',
  artistDashboardTitle: 'Artist Dashboard',
  uploadTrackTitle: 'Upload Track',

  // Settings — Fast facts section
  appLanguage: 'App Language',
  appLanguageEnglish: 'English',
  appLanguageRussian: 'Russian',
  settingsAudioSubtitle: 'Lossless, Dolby Atmos & more',
  mbankConnectedId: 'MBANK Connected ID',
  settingsSearchPlaceholder: 'Search settings',
  settingsNoResultsPrefix: 'No settings match',
  sectionGeneral: 'General',
  sectionAudio: 'Audio Streaming & Lossless',
  sectionPlayback: 'Playback & Sound Engine',
  sectionDownloads: 'Downloads & Storage',
  sectionAccount: 'Account & Payments',
  rowLossless: 'Lossless',
  losslessSubtitle: 'Preview setting — not yet applied to streams',
  rowWifiQuality: 'Wi-Fi Quality',
  rowCellularQuality: 'Cellular Quality',
  rowDolbyAtmos: 'Dolby Atmos',
  dolbyAtmosSubtitle: "Preview setting — spatial audio isn't available yet",
  rowVolumeNorm: 'Volume Normalization',
  volumeNormSubtitle: 'Keep playback volume consistent between tracks',
  rowCrossfade: 'Crossfade',
  rowGapless: 'Gapless',
  gaplessSubtitle: 'Seamless transitions between tracks',
  rowEqualizer: 'Equalizer',
  rowDownloadQuality: 'Download Quality',
  rowDownloadCellular: 'Download over Cellular',
  downloadCellularSubtitle: 'Allow offline transfers over mobile data',
  rowStorageUsed: 'Storage Used',
  rowClearCache: 'Clear Cache',
  rowFastPay: 'MBANK Fast-Pay Authorization',
  rowSupportReceipts: 'Artist Support Receipts',
  supportReceiptsSubtitle: 'Monthly email',
  footerPowered: 'Powered by MBANK Core Architecture',
  linkTerms: 'Terms',
  linkPrivacy: 'Privacy',
  linkAudioLicenses: 'Audio Licenses',

  // Profile Hub
  statSaved: 'Saved',
  statPlaylists: 'Playlists',
  statSupported: 'Supported',
  memberSince: 'Member since',
  studioSanctuary: 'Studio Sanctuary',
  menuSettings: 'Settings',
  menuSettingsSubtitle: 'Language, audio, downloads, and more',
  menuSupportHistory: 'Support History',
  supportedSuffix: 'supported',
  artistsSuffix: 'artists',
  menuAudioQuality: 'Audio Quality & Playback',
  menuDownloads: 'Downloads & Offline',
  usedSuffix: 'used',
  downloadedSuffix: 'downloaded',
  menuAccount: 'Account & Security',
  menuArtistDashboard: 'Artist Dashboard',
  menuBecomeArtist: 'Become an Artist',
  becomeArtistSubtitle: 'Publish and monetize your tracks on Mmusic',
  logOut: 'Log Out',
  toastSignOut: "Signing out isn't available in this preview",
  toastChangePhoto: "Changing your photo isn't available yet",

  // Home
  forYou: 'For you',
  trendingNow: 'Trending Now',
  seeAll: 'See All',
  newReleases: 'New Releases',
  explore: 'Explore',
  jumpBackIn: 'Jump Back In',
  historyAction: 'History',
  toastFullHistory: "Full listening history isn't available yet",
  moodVibeMixes: 'Mood & Vibe Mixes',

  // Search
  searchPlaceholder: 'What do you want to listen to?',
  clearAll: 'Clear all',
  trendingSearches: 'Trending Searches',
  recentSearches: 'Recent Searches',
  browseAll: 'Browse All',
  searchResultsPlaceholder: 'Songs, artists, or albums...',
  searchClearLabel: 'Clear search',
  searchEmptyTitle: 'Search Mmusic',
  searchEmptyHint: 'Find songs, artists, albums and playlists.',
  searchNoResultsPrefix: 'No results for',
  searchNoResultsHint: 'Please check your spelling or try searching for another artist, track, album, or genre.',
  exploreAllGenres: 'Explore All Genres',
  genreTrendingNow: 'Trending right now',
  searchTopResult: 'Top Result',
  artistLabel: 'Artist',
  monthlyListenersSuffix: 'monthly listeners',
  searchAlbumsHeader: 'Albums & EPs',
  albumTypeAlbum: 'Album',
  albumTypeSingle: 'Single',
  albumTypeEp: 'EP',
  searchFeaturedPlaylists: 'Featured Playlists',
  officialPlaylistLabel: 'Official Playlist',
  playlistLabel: 'Playlist',
  playlistSongSingular: 'song',
  playlistSongPlural: 'songs',
  notificationsLabel: 'Notifications',
  voiceSearchLabel: 'Voice search',
  voiceSearchComingSoon: 'Voice Search is coming soon',
  thisGenreFallback: 'this genre',
  genreFallback: 'Genre',
  listenNow: 'Listen Now',
  followLabel: 'Follow',
  followingLabel: 'Following',
  genreCompilationsTitle: 'Essential Compilations',
  genreCompilationsSubtitle: 'Signature soundscapes and journeys',
  tracksCountSuffix: 'tracks',
  genrePioneeringArtistsTitle: 'Pioneering Artists',
  genrePioneeringArtistsSubtitle: 'The artists shaping the sound',
  fansSuffix: 'fans',
  genreTrendingLiveTopPrefix: 'Trending — Live Top',
  mostPlayedRightNow: 'Most played right now',
  recentReleasesSubtitle: 'Recent releases',
  allGenresTitle: 'All Genres & Moods',
  allGenresSubtitle: 'Explore 24+ sonic realms & curated cultures',
  curatedRealmsTitle: 'Curated Realms',
  tapToDiveLabel: 'Tap to dive',
  filterGenres: 'Genres',
  filterMoodsActivities: 'Moods & Activities',
  filterRegionalHeritage: 'Regional & Heritage',
  genreTagRegional: 'Regional',
  genreTagPersonal: 'Personal',
  genreTagCharts: 'Charts',
  genreTagGenreKind: 'Genre',
  genreTagMood: 'Mood',
  genreTagDiscovery: 'Discovery',

  // Library
  yourLibrary: 'Your Library',
  likedSongs: 'Liked Songs',
  librarySearchPlaceholder: 'Search your library',
  cancel: 'Cancel',
  filterAll: 'All',
  filterPlaylists: 'Playlists',
  filterArtists: 'Artists',
  filterAlbums: 'Albums',
  filterDownloaded: 'Downloaded',
  recentlyAdded: 'Recently Added',
  sortAlphabetical: 'Alphabetical',
  libraryEmptyGeneric: 'Nothing here yet.',
  libraryEmptyDownloaded: 'Nothing downloaded yet.',
  libraryNoMatchesPrefix: 'No matches for',
  libraryNoMatchesSuffix: 'in your library.',
  songsHeader: 'Songs',
  removeDownloadLabel: 'Remove download',
  downloadOfflineLabel: 'Download offline',
  toastDownloadRemoved: 'Download removed',
  toastMarkedForOffline: 'Marked for offline (demo — no audio is stored yet)',

  // Detail screen actions (Playlist/Album/Artist)
  removedFromLibrary: 'Removed from Library',
  savedToLibrary: 'Saved to Library',
  removePlaylistFromLibrary: 'Remove playlist from Library',
  savePlaylist: 'Save playlist',
  removeAlbumFromLibrary: 'Remove album from Library',
  saveAlbum: 'Save album',
  download: 'Download',
  supportArtistLabel: 'Support',
  playPopularTracksLabel: 'Play popular tracks',
  shufflePopularTracksLabel: 'Shuffle popular tracks',

  // Player
  playingFromAlbum: 'PLAYING FROM ALBUM',
  playingLabel: 'PLAYING',
  demoAudio: 'Demo audio',
  lyricsTab: 'Lyrics',
  queueTab: 'Queue',
  supportTab: 'Support',
  donate: 'Donate',
  audioTab: 'Audio',
  queueEmpty: 'Queue is empty',
  queueEmptyHint: 'Play a track to start building your queue.',
  infinityAutoplay: 'Infinity Autoplay',

  // Sheets & dialogs
  supportArtistTitle: 'Support Artist',
  artistNotFoundLabel: 'Artist not found.',
  moreAmountLabel: 'More',
  customAmountPlaceholder: 'Custom amount',
  amountValidationError: 'Enter an amount greater than 0.',
  selectAnAmount: 'Select an amount',
  directPayoutToArtistLabel: 'Direct payout to artist',
  addToPlaylistTitle: 'Add to Playlist',
  addToPlaylistSubtitle: 'Choose one or more destinations',
  findPlaylistPlaceholder: 'Find a playlist…',
  newPlaylistLabel: 'New Playlist',
  newPlaylistAutoInsertSubtitle: 'Create and auto-insert current track',
  doneLabel: 'Done',
  demoPillLabel: 'DEMO',
  allCaughtUpLabel: 'All caught up',
  notificationsEmptyTitle: 'No notifications',
  notificationsEmptyHint: 'New releases and support receipts will show up here.',
  markAllReadLabel: 'Mark all read',
  pageNotFoundTitle: 'Page not found',
  pageNotFoundHint: "This link doesn't lead anywhere in Mmusic. It may be mistyped or no longer available.",
  goToHomeLabel: 'Go to Home',
  likeLabel: 'Like',
  unlikeLabel: 'Unlike',
  addToPlaylistRowLabel: 'Add to playlist',
  viewArtistLabel: 'View artist',
  goToAlbumLabel: 'Go to album',
  shareTrackLabel: 'Share track',
  playLabel: 'Play',
  shuffleLabel: 'Shuffle',
  nothingToShowLabel: 'Nothing to show.',
  closeLabel: 'Close',
  saveToLibraryLabel: 'Save to Library',
  removeFromLibraryLabel: 'Remove from Library',
  shareAlbumLabel: 'Share album',
  sharePlaylistLabel: 'Share playlist',
} as const;

const RU_STRINGS: Record<keyof typeof EN_STRINGS, string> = {
  homeTab: 'Главная',
  searchTab: 'Поиск',
  libraryTab: 'Библиотека',

  profileTitle: 'Профиль',
  settingsTitle: 'Настройки',
  becomeArtistTitle: 'Стать артистом',
  artistSetupTitle: 'Настройка артиста',
  artistDashboardTitle: 'Кабинет артиста',
  uploadTrackTitle: 'Загрузить трек',

  appLanguage: 'Язык приложения',
  appLanguageEnglish: 'English',
  appLanguageRussian: 'Русский',
  settingsAudioSubtitle: 'Lossless, Dolby Atmos и другое',
  mbankConnectedId: 'MBANK Connected ID',
  settingsSearchPlaceholder: 'Поиск в настройках',
  settingsNoResultsPrefix: 'Нет совпадений с',
  sectionGeneral: 'Общие',
  sectionAudio: 'Аудиопоток и Lossless',
  sectionPlayback: 'Воспроизведение и звук',
  sectionDownloads: 'Загрузки и память',
  sectionAccount: 'Аккаунт и платежи',
  rowLossless: 'Lossless',
  losslessSubtitle: 'Предпросмотр — пока не влияет на поток',
  rowWifiQuality: 'Качество по Wi-Fi',
  rowCellularQuality: 'Качество по сотовой сети',
  rowDolbyAtmos: 'Dolby Atmos',
  dolbyAtmosSubtitle: 'Предпросмотр — объёмный звук пока недоступен',
  rowVolumeNorm: 'Нормализация громкости',
  volumeNormSubtitle: 'Выравнивает громкость между треками',
  rowCrossfade: 'Кроссфейд',
  rowGapless: 'Без пауз',
  gaplessSubtitle: 'Плавные переходы между треками',
  rowEqualizer: 'Эквалайзер',
  rowDownloadQuality: 'Качество загрузки',
  rowDownloadCellular: 'Загрузка по сотовой сети',
  downloadCellularSubtitle: 'Разрешить загрузку через мобильный интернет',
  rowStorageUsed: 'Использовано памяти',
  rowClearCache: 'Очистить кэш',
  rowFastPay: 'Быстрая авторизация MBANK',
  rowSupportReceipts: 'Квитанции поддержки артистов',
  supportReceiptsSubtitle: 'Ежемесячно на email',
  footerPowered: 'На основе MBANK Core Architecture',
  linkTerms: 'Условия',
  linkPrivacy: 'Конфиденциальность',
  linkAudioLicenses: 'Аудиолицензии',

  statSaved: 'Сохранено',
  statPlaylists: 'Плейлисты',
  statSupported: 'Поддержано',
  memberSince: 'На сервисе с',
  studioSanctuary: 'Студийное убежище',
  menuSettings: 'Настройки',
  menuSettingsSubtitle: 'Язык, звук, загрузки и другое',
  menuSupportHistory: 'История поддержки',
  supportedSuffix: 'поддержано',
  artistsSuffix: 'артистов',
  menuAudioQuality: 'Качество звука и воспроизведение',
  menuDownloads: 'Загрузки и офлайн',
  usedSuffix: 'использовано',
  downloadedSuffix: 'загружено',
  menuAccount: 'Аккаунт и безопасность',
  menuArtistDashboard: 'Кабинет артиста',
  menuBecomeArtist: 'Стать артистом',
  becomeArtistSubtitle: 'Публикуйте и монетизируйте треки на Mmusic',
  logOut: 'Выйти',
  toastSignOut: 'Выход недоступен в этом демо',
  toastChangePhoto: 'Смена фото пока недоступна',

  forYou: 'Для вас',
  trendingNow: 'В тренде',
  seeAll: 'Смотреть все',
  newReleases: 'Новые релизы',
  explore: 'Смотреть',
  jumpBackIn: 'Продолжить слушать',
  historyAction: 'История',
  toastFullHistory: 'Полная история прослушиваний пока недоступна',
  moodVibeMixes: 'Настроение и атмосфера',

  searchPlaceholder: 'Что хотите послушать?',
  clearAll: 'Очистить всё',
  trendingSearches: 'Популярные запросы',
  recentSearches: 'Недавние запросы',
  browseAll: 'Все категории',
  searchResultsPlaceholder: 'Песни, артисты или альбомы...',
  searchClearLabel: 'Очистить поиск',
  searchEmptyTitle: 'Искать в Mmusic',
  searchEmptyHint: 'Находите песни, артистов, альбомы и плейлисты.',
  searchNoResultsPrefix: 'Нет результатов по запросу',
  searchNoResultsHint: 'Проверьте написание или попробуйте другого артиста, трек, альбом или жанр.',
  exploreAllGenres: 'Все жанры',
  genreTrendingNow: 'В тренде сейчас',
  searchTopResult: 'Лучший результат',
  artistLabel: 'Артист',
  monthlyListenersSuffix: 'слушателей в месяц',
  searchAlbumsHeader: 'Альбомы и EP',
  albumTypeAlbum: 'Альбом',
  albumTypeSingle: 'Сингл',
  albumTypeEp: 'EP',
  searchFeaturedPlaylists: 'Подборки плейлистов',
  officialPlaylistLabel: 'Официальный плейлист',
  playlistLabel: 'Плейлист',
  playlistSongSingular: 'трек',
  playlistSongPlural: 'треков',
  notificationsLabel: 'Уведомления',
  voiceSearchLabel: 'Голосовой поиск',
  voiceSearchComingSoon: 'Голосовой поиск скоро появится',
  thisGenreFallback: 'этот жанр',
  genreFallback: 'Жанр',
  listenNow: 'Слушать',
  followLabel: 'Подписаться',
  followingLabel: 'Подписан',
  genreCompilationsTitle: 'Знаковые сборники',
  genreCompilationsSubtitle: 'Фирменное звучание и музыкальные путешествия',
  tracksCountSuffix: 'треков',
  genrePioneeringArtistsTitle: 'Пионеры жанра',
  genrePioneeringArtistsSubtitle: 'Артисты, определившие звучание жанра',
  fansSuffix: 'фанатов',
  genreTrendingLiveTopPrefix: 'В тренде — топ',
  mostPlayedRightNow: 'Популярно прямо сейчас',
  recentReleasesSubtitle: 'Недавние релизы',
  allGenresTitle: 'Все жанры и настроения',
  allGenresSubtitle: 'Исследуйте более 24 звуковых миров и уникальных культур',
  curatedRealmsTitle: 'Избранные направления',
  tapToDiveLabel: 'Нажмите',
  filterGenres: 'Жанры',
  filterMoodsActivities: 'Настроение и активности',
  filterRegionalHeritage: 'Регион и наследие',
  genreTagRegional: 'Регион',
  genreTagPersonal: 'Персонально',
  genreTagCharts: 'Чарты',
  genreTagGenreKind: 'Жанр',
  genreTagMood: 'Настроение',
  genreTagDiscovery: 'Открытие',

  yourLibrary: 'Ваша библиотека',
  likedSongs: 'Любимые треки',
  librarySearchPlaceholder: 'Поиск в библиотеке',
  cancel: 'Отмена',
  filterAll: 'Все',
  filterPlaylists: 'Плейлисты',
  filterArtists: 'Артисты',
  filterAlbums: 'Альбомы',
  filterDownloaded: 'Загруженные',
  recentlyAdded: 'Недавно добавлено',
  sortAlphabetical: 'По алфавиту',
  libraryEmptyGeneric: 'Здесь пока ничего нет.',
  libraryEmptyDownloaded: 'Пока ничего не загружено.',
  libraryNoMatchesPrefix: 'Нет совпадений с',
  libraryNoMatchesSuffix: 'в вашей библиотеке.',
  songsHeader: 'Треки',
  removeDownloadLabel: 'Удалить загрузку',
  downloadOfflineLabel: 'Загрузить для офлайна',
  toastDownloadRemoved: 'Загрузка удалена',
  toastMarkedForOffline: 'Отмечено для офлайна (демо — аудио пока не сохраняется)',

  removedFromLibrary: 'Удалено из библиотеки',
  savedToLibrary: 'Сохранено в библиотеку',
  removePlaylistFromLibrary: 'Удалить плейлист из библиотеки',
  savePlaylist: 'Сохранить плейлист',
  removeAlbumFromLibrary: 'Удалить альбом из библиотеки',
  saveAlbum: 'Сохранить альбом',
  download: 'Загрузить',
  supportArtistLabel: 'Поддержать',
  playPopularTracksLabel: 'Включить популярные треки',
  shufflePopularTracksLabel: 'Перемешать популярные треки',

  playingFromAlbum: 'ИГРАЕТ ИЗ АЛЬБОМА',
  playingLabel: 'ИГРАЕТ',
  demoAudio: 'Демо-аудио',
  lyricsTab: 'Текст',
  queueTab: 'Очередь',
  supportTab: 'Поддержка',
  donate: 'Поддержать артиста',
  audioTab: 'Аудио',
  queueEmpty: 'Очередь пуста',
  queueEmptyHint: 'Запустите трек, чтобы начать собирать очередь.',
  infinityAutoplay: 'Бесконечное автовоспроизведение',

  supportArtistTitle: 'Поддержать артиста',
  artistNotFoundLabel: 'Артист не найден.',
  moreAmountLabel: 'Другая',
  customAmountPlaceholder: 'Своя сумма',
  amountValidationError: 'Введите сумму больше 0.',
  selectAnAmount: 'Выберите сумму',
  directPayoutToArtistLabel: 'Прямая выплата артисту',
  addToPlaylistTitle: 'Добавить в плейлист',
  addToPlaylistSubtitle: 'Выберите один или несколько плейлистов',
  findPlaylistPlaceholder: 'Найти плейлист…',
  newPlaylistLabel: 'Новый плейлист',
  newPlaylistAutoInsertSubtitle: 'Создать и сразу добавить текущий трек',
  doneLabel: 'Готово',
  demoPillLabel: 'ДЕМО',
  allCaughtUpLabel: 'Все прочитано',
  notificationsEmptyTitle: 'Нет уведомлений',
  notificationsEmptyHint: 'Здесь появятся новые релизы и квитанции поддержки.',
  markAllReadLabel: 'Отметить все как прочитанные',
  pageNotFoundTitle: 'Страница не найдена',
  pageNotFoundHint: 'Такой ссылки в Mmusic не существует. Возможно, она набрана с ошибкой или больше не действует.',
  goToHomeLabel: 'На главную',
  likeLabel: 'Добавить в Любимые',
  unlikeLabel: 'Убрать из Любимых',
  addToPlaylistRowLabel: 'Добавить в плейлист',
  viewArtistLabel: 'Перейти к артисту',
  goToAlbumLabel: 'Перейти к альбому',
  shareTrackLabel: 'Поделиться треком',
  playLabel: 'Включить',
  shuffleLabel: 'Перемешать',
  nothingToShowLabel: 'Нечего показать.',
  closeLabel: 'Закрыть',
  saveToLibraryLabel: 'Сохранить в библиотеку',
  removeFromLibraryLabel: 'Удалить из библиотеки',
  shareAlbumLabel: 'Поделиться альбомом',
  sharePlaylistLabel: 'Поделиться плейлистом',
};

export type AppStringKey = keyof typeof EN_STRINGS;
export const APP_STRINGS: Record<'en' | 'ru', Record<AppStringKey, string>> = { en: EN_STRINGS, ru: RU_STRINGS };

/** "Manage {artist}'s releases" — the one Profile Hub string that embeds a
 * live artist name (data), kept out of the flat table like track/album
 * titles already are. */
export function manageReleasesLabel(locale: 'en' | 'ru', artistName: string): string {
  return locale === 'ru' ? `Релизы артиста ${artistName}` : `Manage ${artistName}'s releases`;
}

/** "Play {artist}'s top tracks" — accessibility label on the Search top-result
 * play button; word order differs enough between locales to need a function. */
export function playArtistTopTracksLabel(locale: 'en' | 'ru', artistName: string): string {
  return locale === 'ru' ? `Включить топ треков артиста ${artistName}` : `Play ${artistName} top tracks`;
}

/** "Notifications, {count} unread" accessibility label on the Search header bell. */
export function notificationsUnreadLabel(locale: 'en' | 'ru', count: number): string {
  return locale === 'ru' ? `Уведомления, ${count} непрочитанных` : `Notifications, ${count} unread`;
}

/** Genre follow/unfollow toast — `followed` is the state *before* the toggle,
 * matching the call site in genre/[id].tsx. */
export function genreFollowToggleToast(locale: 'en' | 'ru', followed: boolean, genreTitle: string): string {
  if (locale === 'ru') return followed ? `Вы отписались от «${genreTitle}»` : `Вы подписаны на «${genreTitle}»`;
  return followed ? `Unfollowed ${genreTitle}` : `Following ${genreTitle}`;
}

/** Genre hero "kind" pill (e.g. "Genre", "Mood", "Charts") — the English
 * identifier lives in src/mocks/genres.ts `GenreDetail.label` (same pattern
 * as `album.type`'s 'ep'/'single' enum); this maps the 6 known values to
 * their localized display text. Unrecognized values pass through untouched. */
const GENRE_TAG_KEYS: Record<string, AppStringKey> = {
  Regional: 'genreTagRegional',
  Personal: 'genreTagPersonal',
  Charts: 'genreTagCharts',
  Genre: 'genreTagGenreKind',
  Mood: 'genreTagMood',
  Discovery: 'genreTagDiscovery',
};

export function genreTagLabel(locale: 'en' | 'ru', label: string): string {
  const key = GENRE_TAG_KEYS[label];
  return key ? APP_STRINGS[locale][key] : label;
}

/** "Direct artist patronage for {name}" — Support sheet subtitle; embeds a live artist name (data). */
export function artistPatronageSubtitle(locale: 'en' | 'ru', artistName: string): string {
  return locale === 'ru' ? `Прямая поддержка артиста ${artistName}` : `Direct artist patronage for ${artistName}`;
}

/** "Support with {amount} сом" CTA once an amount is chosen; "сом" stays untranslated like every other KGS amount in the app. */
export function supportWithAmountLabel(locale: 'en' | 'ru', formattedAmount: string): string {
  return locale === 'ru' ? `Поддержать на ${formattedAmount} сом` : `Support with ${formattedAmount} сом`;
}

/** "Added to {playlistTitle}" toast on the Add to Playlist sheet; playlist title is data. */
export function addedToPlaylistToast(locale: 'en' | 'ru', playlistTitle: string): string {
  return locale === 'ru' ? `Добавлено в «${playlistTitle}»` : `Added to ${playlistTitle}`;
}

/** "{count} unread" — Notifications sheet subtitle when there are unread items. */
export function unreadCountSubtitle(locale: 'en' | 'ru', count: number): string {
  return locale === 'ru' ? `${count} непрочитанных` : `${count} unread`;
}

/** "Unread. " a11y prefix read before a notification row's title/body. */
export function unreadRowPrefix(locale: 'en' | 'ru'): string {
  return locale === 'ru' ? 'Непрочитано. ' : 'Unread. ';
}

/** Options sheet's share fallback toast; the deep link itself (kind/id) is data, never translated. */
export function sharingNotSupportedToast(locale: 'en' | 'ru', deepLink: string): string {
  return locale === 'ru' ? `Общий доступ здесь не поддерживается — ссылка: ${deepLink}` : `Sharing isn't supported here — link: ${deepLink}`;
}
