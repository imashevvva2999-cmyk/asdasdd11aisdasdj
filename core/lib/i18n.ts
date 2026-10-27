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
  campaignDetailsTitle: 'Campaign details',

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
  addLabel: 'Add',
  addedLabel: 'Added',
  artistAndAlbumLabel: 'Artist and album',
  genreCompilationsTitle: 'Essential Compilations',
  genreCompilationsSubtitle: 'Signature soundscapes and journeys',
  tracksCountSuffix: 'tracks',
  genrePioneeringArtistsTitle: 'Pioneering Artists',
  genrePioneeringArtistsSubtitle: 'The artists shaping the sound',
  fansSuffix: 'fans',
  genreTopPrefix: 'Top',
  genreTracksSubtitle: 'Tracks in this genre',
  genreNoTracksTitle: 'No tracks here yet',
  genreNoTracksHint: 'Tracks for this genre are on their way.',
  starsCtaLabel: 'Go',
  promoteSongTitle: 'Promote a song',
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

  // Task 5 — final sweep: Navigation / common
  moreOptionsLabel: 'More options',
  backLabel: 'Back',
  searchResultsTitle: 'Search Results',

  // Task 5 — Create Playlist
  createPlaylistLabel: 'Create Playlist',
  createShortLabel: 'Create',
  addCoverLabel: 'Add Cover',
  customArtOrPhotoHint: 'Custom art or photo',
  aiGenerateLabel: 'AI Generate',
  toastAiCoversUnavailable: "AI-generated covers aren't available yet",
  colorWaveLabel: 'Color Wave',
  toastColorWaveApplied: 'Color Wave cover applied',
  toastSampleCoverSelected: 'Sample cover selected (demo — no photo picker yet)',
  coverSuffixWord: 'cover',
  nameFieldLabel: 'Name',
  playlistNamePlaceholder: 'Give your playlist a name…',
  descriptionFieldLabel: 'Description',
  optionalSuffixLabel: '(Optional)',
  descriptionOptionalAccessibility: 'Description (Optional)',
  vibePlaceholder: "What's the vibe?",
  publicPlaylistLabel: 'Public Playlist',
  publicPlaylistSubtitle: 'Anyone can find and listen',
  collaborativeLabel: 'Collaborative',
  collaborativeSubtitle: 'Invite friends to add tracks',

  // Task 5 — Library / Liked Songs / Playlist / Album / Artist
  playAllLabel: 'Play All',
  showAsListLabel: 'Show as list',
  showAsGridLabel: 'Show as grid',
  autoPlaylistLabel: 'Auto Playlist',
  savedTrackSingular: 'saved track',
  savedTrackPlural: 'saved tracks',
  likedSongsEmptyTitle: 'No liked songs yet',
  likedSongsEmptyHint: 'Tap the heart on any track to save it here.',
  titleLabel: 'Title',
  sortDefaultOrderLabel: 'Default order',
  playAlbumLabel: 'Play album',
  popularSectionLabel: 'Popular',
  releasesSectionLabel: 'Releases',
  fansAlsoLikeLabel: 'Fans Also Like',
  aboutSectionLabel: 'About',
  albumNotFoundMessage: 'Album not found.',
  playlistNotFoundMessage: 'Playlist not found.',
  tracksHeaderLabel: 'Tracks',
  noTracksAvailableMessage: 'No tracks available in this preview.',
  trackCountSingular: 'track',
  trackCountPlural: 'tracks',
  noTracksYetMessage: "No tracks yet — add some from any track's ⋮ menu.",
  editorialPlaylistLabel: 'Editorial Playlist',
  editorialWordLabel: 'Editorial',
  yourPlaylistLabel: 'Your playlist',
  mmusicEditorialLabel: 'Mmusic Editorial',
  saveLabel: 'Save',
  toastRemovedFromLikedSongs: 'Removed from Liked Songs',
  toastAddedToLikedSongs: 'Added to Liked Songs',
  releasedPrefix: 'Released',

  // Task 5 — Home / See All
  freshFindsTitle: 'Fresh Finds',
  topTracksTitle: 'Top Tracks',
  allAlbumsTitle: 'All Albums',
  allSinglesTitle: 'All Singles',
  filterThisWeekLabel: 'This Week',
  filterTopChartsLabel: 'Top Charts',
  filterSinglesLabel: 'Singles',
  upNextLabel: 'Up next',
  likedStateLabel: 'Liked',

  // Task 5 — Player
  collapsePlayerLabel: 'Collapse player',
  demoAudioViewCreditsLabel: 'Demo audio. View credits',
  previousTrackLabel: 'Previous track',
  nextTrackLabel: 'Next track',
  repeatLabel: 'Repeat',
  pauseLabel: 'Pause',
  playUnavailableLabel: 'Play (no audio in this preview)',
  loadingPauseLabel: 'Loading. Pause',
  noAudioPreviewMessage: 'No audio in this preview',
  playbackErrorMessage: "Couldn't play this track. Tap play to retry.",
  nothingPlayingLabel: 'Nothing is playing',
  playingNextLabel: 'Playing Next',
  keepPlayingSimilarMusicHint: 'Keep playing similar music',
  seekLabel: 'Seek',
  ofConnectorWord: 'of',
  trackOptionsLabel: 'Track options',
  optionsLabel: 'Options',

  // Task 5 — Profile / Account / Support History
  accountSectionLabel: 'Account',
  usernameFieldLabel: 'Username',
  personNameLabel: 'Name',
  securitySectionLabel: 'Security',
  connectedDemoLabel: 'Connected (demo)',
  demoAccountNote: 'Demo account — no real MBANK account is linked in this preview.',
  changeProfilePhotoLabel: 'Change profile photo',
  editProfilePhotoLabel: 'Edit profile photo',
  totalSupportedLabel: 'Total Supported',
  creatorSingular: 'creator',
  creatorPlural: 'creators',
  directPatronageToPrefix: 'Direct patronage to',
  demoHistoryLabel: 'Demo history',
  noSupportHistoryTitle: "You haven't supported any artists yet",
  noSupportHistoryHint: "Open an artist's profile and tap Support to send direct patronage.",
  grantSingular: 'Grant',
  grantPlural: 'Grants',
  unknownArtistLabel: 'Unknown artist',
  directFanPatronageLabel: 'Direct Fan Patronage',
  completedStatusLabel: 'Completed',
  mbankDirectCreatorNetworkLabel: 'MBANK Direct Creator Network',
  filterThisMonthLabel: 'This Month',

  // Task 5 — Become Artist / Artist Setup / Upload Track
  shareYourSoundTitle: 'Share Your Sound with the World',
  shareYourSoundSubtitle: 'Share your music, connect with listeners and receive support directly through Mmusic.',
  shareYourMusicTitle: 'Share Your Music',
  shareYourMusicSubtitle: 'Upload and publish your tracks.',
  fanSupportTitle: 'Fan Support',
  fanSupportSubtitle: 'Receive support directly from listeners.',
  artistInsightsTitle: 'Artist Insights',
  artistInsightsSubtitle: 'See how listeners engage with your music.',
  becomeArtistCta: 'BECOME AN ARTIST',
  toastInitializingArtistStudio: 'Initializing Artist Studio setup…',
  artistPhotoLabel: 'Artist Photo',
  stageNameLabel: 'Artist / Stage Name',
  stageNamePlaceholder: 'Your stage name',
  primaryGenreLabel: 'Primary Genre',
  shortBioLabel: 'Short Bio',
  shortBioPlaceholder: 'Tell listeners about your sound',
  locationFieldLabel: 'Location / Base City',
  locationFieldPlaceholder: 'City, Country',
  createArtistProfileLabel: 'Create Artist Profile',
  artistTermsDisclaimer: "By creating a profile, you agree to Mmusic's Artist Terms. Local preview — nothing is sent or verified.",
  changeArtistPhotoLabel: 'Change artist photo',
  addArtistPhotoLabel: 'Add artist photo',
  trackPublishedTitle: 'Track Published',
  viewPublicProfileLabel: 'View Public Profile',
  backToDashboardLabel: 'Back to Dashboard',
  uploadAudioLabel: 'Upload Audio',
  highQualityAudioFileHint: 'High-quality audio file',
  browseFileLabel: 'Browse File',
  trackDetailsLabel: 'Track Details',
  trackTitleFieldLabel: 'Track Title',
  artistCollaboratorsLabel: 'Artist / Featured Collaborators',
  optionalPlaceholder: 'Optional',
  genreFieldLabel: 'Genre',
  coverArtworkLabel: 'Cover Artwork',
  addHighQualityArtworkHint: 'Add high quality artwork',
  chooseCoverLabel: 'Choose Cover',
  changeCoverLabel: 'Change Cover',
  coverInvalidType: 'Choose a JPG, PNG or WebP image',
  coverTooLarge: 'This image is larger than 10 MB',
  coverUnreadable: 'This image could not be opened',
  releaseSettingsLabel: 'Release Settings',
  scheduleReleaseLabel: 'Schedule Release',
  releaseNowOptionLabel: 'Release Now',
  scheduleOptionLabel: 'Schedule',
  scheduleHintText: "Scheduling isn't available in this preview — the track will still publish immediately when you tap Publish Track.",
  explicitContentLabel: 'Explicit Content',
  uploadingStatusLabel: 'Uploading…',
  transcodingStatusLabel: 'Transcoding…',
  publishErrorMessage: 'Something went wrong publishing this track.',
  retryLabel: 'Retry',
  publishTrackLabel: 'Publish Track',
  saveAsDraftLabel: 'Save as Draft',
  simulatePublishErrorLabel: 'Simulate publish error (demo)',
  toastSavedAsDraft: 'Saved as draft',

  // Task 5 — Sheets (Demo audio / Support confirm / Support success)
  demoAudioDescriptionHint: 'These tracks play licensed demo audio so the player can be tested. It is not the original recording.',
  licenceCcBy4Label: 'Licence (CC BY 4.0)',
  sourceIncompetechLabel: 'Source: incompetech.com',
  nothingToConfirmMessage: 'Nothing to confirm. Go back and choose a support amount.',
  contributionAmountLabel: 'Contribution Amount',
  mbankAccountMasked: 'MBANK account •••• 4892',
  directWordLabel: 'Direct',
  demoNoMoneySentLabel: 'Demo — no money is sent',
  nothingRecentSupportMessage: 'No recent support to show.',
  directPatronageCompleteLabel: 'Direct Patronage Complete',
  demoNoMoneyWasSentLabel: 'Demo — no money was sent',
  viewSupportReceiptLabel: 'View Support Receipt in History',

  // Universal MBANK Payment Widget (mbank-processing / mbank-result sheets)
  mbankWidgetProcessingTitle: 'Processing payment…',
  mbankWidgetProcessingHint: 'This only takes a moment.',
  mbankWidgetFailedTitle: 'Payment failed',
  mbankWidgetFailedHint: 'The demo bank declined this payment. You can try again.',
  mbankWidgetCancelledTitle: 'Payment cancelled',
  mbankWidgetCancelledHint: 'You cancelled before the payment completed.',
  mbankWidgetSimulateDeclineLabel: 'Simulate decline (demo)',
  mbankWidgetSubscriptionActivatedTitle: 'Plan activated',
  mbankWidgetPurchaseSuccessTitle: 'Purchase complete',
  mbankWidgetReferenceLabel: 'Reference',

  // Floating MBANK payment button + launcher (mbank-launcher* sheets)
  mbankFloatingButtonLabel: 'MBANK Pay (Demo)',
  mbankLauncherTitle: 'MBANK Pay',
  mbankLauncherSubtitle: 'Choose what you want to pay for',
  mbankScenarioDonationTitle: 'Artist Donation',
  mbankScenarioDonationSubtitle: 'Support an artist directly',
  mbankScenarioStudioProTitle: 'Studio Pro',
  mbankScenarioStudioProSubtitle: 'Manage your subscription plan',
  mbankScenarioPurchaseTitle: 'General Purchase',
  mbankScenarioPurchaseSubtitle: 'A demo one-off payment',
  mbankPickArtistTitle: 'Choose an artist',
  mbankPurchaseAmountTitle: 'Choose an amount',
  mbankGeneralPurchaseDescription: 'General Purchase (Demo)',
  continueLabel: 'Continue',

  // Task 5 — Settings sections
  decreaseCrossfadeLabel: 'Decrease crossfade',
  increaseCrossfadeLabel: 'Increase crossfade',
  qualityLowLabel: 'Low',
  qualityNormalLabel: 'Normal',
  qualityHighLabel: 'High',
  equalizerFlatLabel: 'Flat',
  biometricActiveDemoLabel: 'Biometric Active (demo)',
  disabledStatusLabel: 'Disabled',
  toastCacheCleared: 'Cache cleared',

  // Task 5 — Downloads & Offline
  downloadedMusicLabel: 'Downloaded Music',
  nothingDownloadedHint: 'Nothing downloaded yet. Use Download on an album or playlist to keep it here.',
  downloadsPreviewNote: 'Downloads are a preview — no audio is stored on this device yet.',

  // Task 5 — root header titles (src/app/_layout.tsx)
  albumHeaderTitle: 'Album',
  playlistHeaderTitle: 'Playlist',
  swipeExpandHint: 'Swipe up to expand, left or right to change track',
  audioQualityIntroText: "Streaming quality and playback preferences. These are preview settings — playback isn't changed yet.",

  // Task 5 — Lyrics (src/lib/lyrics-state.ts)
  lyricsUnavailableDemoTitle: 'Lyrics unavailable for demo audio',
  lyricsUnavailableDemoHint: 'This demo recording is instrumental.',
  lyricsUnavailableTitle: 'Lyrics unavailable',
  lyricsUnavailableHint: "Synchronized lyrics haven't been added for this track yet.",
  sampleLyricsLabel: 'Sample lyrics',
  sampleLyricsHint: 'Placeholder text for the demo, not the official lyrics.',

  // Task 5 — Artwork carousel
  artworkFallbackLabel: 'Artwork',
  openPlayerSwipeHint: 'Open the player. Swipe left for the next track, right for the previous one',
  swipeTrackHint: 'Swipe left for the next track, right for the previous one',

  // Task 5 — Demo notifications (src/state/notifications-store.ts)
  notifReleaseTitle: 'New release',
  notifReleaseBody: 'Solaris Echo released Horizon (Deluxe).',
  notifReleaseTime: '2h ago',
  notifSupportTitle: 'Support completed',
  notifSupportBody: 'Your 100 сом support to Solaris Echo went through.',
  notifSupportTime: 'Yesterday',
  notifPlaylistTitle: 'Playlist updated',
  notifPlaylistBody: 'Late Night Flow has new tracks.',
  notifPlaylistTime: '2d ago',
  notifArtistTitle: 'Trending artist',
  notifArtistBody: 'Kaelen is trending in Electronic this week.',
  notifArtistTime: '4d ago',

  // Task 5 — Catalog playlists' duration/updated labels (src/mocks/playlists.ts)
  durationLateNightFlow: '19 min',
  durationLateNightDriving: '3 hr 12 min',
  durationLofiBeatsToCode: '7 hr 40 min',
  durationElectronicEssentials: '4 hr 02 min',
  durationThisIsSolarisEcho: '2 hr 48 min',
  updatedLateNightFlow: 'Updated 2h ago',
  updatedLateNightDriving: 'Updated 1d ago',
  updatedElectronicEssentials: 'Updated 5d ago',

  // Task 5 — Queue screen
  nowPlayingEyebrowLabel: 'NOW PLAYING',
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
  campaignDetailsTitle: 'Детали кампании',

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
  menuAudioQuality: 'Звук и воспроизведение',
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
  addLabel: 'Добавить',
  addedLabel: 'Добавлено',
  artistAndAlbumLabel: 'Артист и альбом',
  genreCompilationsTitle: 'Знаковые сборники',
  genreCompilationsSubtitle: 'Фирменное звучание и музыкальные путешествия',
  tracksCountSuffix: 'треков',
  genrePioneeringArtistsTitle: 'Пионеры жанра',
  genrePioneeringArtistsSubtitle: 'Артисты, определившие звучание жанра',
  fansSuffix: 'фанатов',
  genreTopPrefix: 'Топ',
  genreTracksSubtitle: 'Треки этого жанра',
  genreNoTracksTitle: 'Здесь пока нет треков',
  genreNoTracksHint: 'Треки этого жанра скоро появятся.',
  starsCtaLabel: 'Вперёд',
  promoteSongTitle: 'Продвижение трека',
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

  moreOptionsLabel: 'Другие действия',
  backLabel: 'Назад',
  searchResultsTitle: 'Результаты поиска',

  createPlaylistLabel: 'Новый плейлист',
  createShortLabel: 'Создать',
  addCoverLabel: 'Добавить обложку',
  customArtOrPhotoHint: 'Своё изображение или фото',
  aiGenerateLabel: 'Создать с ИИ',
  toastAiCoversUnavailable: 'Обложки через ИИ пока недоступны',
  colorWaveLabel: 'Цветовая волна',
  toastColorWaveApplied: 'Применена обложка «Цветовая волна»',
  toastSampleCoverSelected: 'Выбрана примерная обложка (демо — выбор фото пока недоступен)',
  coverSuffixWord: 'обложка',
  nameFieldLabel: 'Название',
  playlistNamePlaceholder: 'Назовите свой плейлист…',
  descriptionFieldLabel: 'Описание',
  optionalSuffixLabel: '(необязательно)',
  descriptionOptionalAccessibility: 'Описание (необязательно)',
  vibePlaceholder: 'Какое настроение?',
  publicPlaylistLabel: 'Публичный плейлист',
  publicPlaylistSubtitle: 'Виден и доступен всем',
  collaborativeLabel: 'Совместный доступ',
  collaborativeSubtitle: 'Друзья смогут добавлять треки',

  playAllLabel: 'Слушать все',
  showAsListLabel: 'Показать списком',
  showAsGridLabel: 'Показать сеткой',
  autoPlaylistLabel: 'Автоплейлист',
  savedTrackSingular: 'сохранённый трек',
  savedTrackPlural: 'сохранённых треков',
  likedSongsEmptyTitle: 'Пока нет любимых треков',
  likedSongsEmptyHint: 'Нажмите на сердечко у любого трека, чтобы сохранить его здесь.',
  titleLabel: 'Название',
  sortDefaultOrderLabel: 'Обычный порядок',
  playAlbumLabel: 'Включить альбом',
  popularSectionLabel: 'Популярное',
  releasesSectionLabel: 'Релизы',
  fansAlsoLikeLabel: 'Фанатам также нравится',
  aboutSectionLabel: 'Об артисте',
  albumNotFoundMessage: 'Альбом не найден.',
  playlistNotFoundMessage: 'Плейлист не найден.',
  tracksHeaderLabel: 'Треки',
  noTracksAvailableMessage: 'В этом демо треки недоступны.',
  trackCountSingular: 'трек',
  trackCountPlural: 'треков',
  noTracksYetMessage: 'Пока нет треков — добавьте их из меню ⋮ любого трека.',
  editorialPlaylistLabel: 'Редакционный плейлист',
  editorialWordLabel: 'Редакционный',
  yourPlaylistLabel: 'Ваш плейлист',
  mmusicEditorialLabel: 'Редакция Mmusic',
  saveLabel: 'Сохранить',
  toastRemovedFromLikedSongs: 'Удалено из Любимых треков',
  toastAddedToLikedSongs: 'Добавлено в Любимые треки',
  releasedPrefix: 'Выпущено в',

  freshFindsTitle: 'Свежие находки',
  topTracksTitle: 'Топ треков',
  allAlbumsTitle: 'Все альбомы',
  allSinglesTitle: 'Все синглы',
  filterThisWeekLabel: 'На этой неделе',
  filterTopChartsLabel: 'Топ чарт',
  filterSinglesLabel: 'Синглы',
  upNextLabel: 'Далее',
  likedStateLabel: 'В Любимых',

  collapsePlayerLabel: 'Свернуть плеер',
  demoAudioViewCreditsLabel: 'Демо-аудио. Посмотреть авторов',
  previousTrackLabel: 'Предыдущий трек',
  nextTrackLabel: 'Следующий трек',
  repeatLabel: 'Повтор',
  pauseLabel: 'Пауза',
  playUnavailableLabel: 'Воспроизведение (в этом демо нет аудио)',
  loadingPauseLabel: 'Загрузка. Пауза',
  noAudioPreviewMessage: 'В этом демо нет аудио',
  playbackErrorMessage: 'Не удалось воспроизвести трек. Нажмите, чтобы повторить.',
  nothingPlayingLabel: 'Ничего не играет',
  playingNextLabel: 'Дальше в очереди',
  keepPlayingSimilarMusicHint: 'Продолжать похожей музыкой',
  seekLabel: 'Перемотка',
  ofConnectorWord: 'из',
  trackOptionsLabel: 'Действия с треком',
  optionsLabel: 'Действия',

  accountSectionLabel: 'Аккаунт',
  usernameFieldLabel: 'Имя пользователя',
  personNameLabel: 'Имя',
  securitySectionLabel: 'Безопасность',
  connectedDemoLabel: 'Подключено (демо)',
  demoAccountNote: 'Демо-аккаунт — в этом демо не подключён реальный счёт MBANK.',
  changeProfilePhotoLabel: 'Изменить фото профиля',
  editProfilePhotoLabel: 'Редактировать фото профиля',
  totalSupportedLabel: 'Всего поддержано',
  creatorSingular: 'автора',
  creatorPlural: 'авторов',
  directPatronageToPrefix: 'Прямая поддержка',
  demoHistoryLabel: 'Демо-история',
  noSupportHistoryTitle: 'Вы ещё не поддержали ни одного артиста',
  noSupportHistoryHint: 'Откройте профиль артиста и нажмите «Поддержать», чтобы отправить прямую поддержку.',
  grantSingular: 'выплата',
  grantPlural: 'выплат',
  unknownArtistLabel: 'Неизвестный артист',
  directFanPatronageLabel: 'Прямая поддержка от фана',
  completedStatusLabel: 'Завершено',
  mbankDirectCreatorNetworkLabel: 'Сеть прямой поддержки авторов MBANK',
  filterThisMonthLabel: 'За этот месяц',

  shareYourSoundTitle: 'Поделитесь своим звучанием с миром',
  shareYourSoundSubtitle: 'Публикуйте музыку, общайтесь со слушателями и получайте поддержку напрямую через Mmusic.',
  shareYourMusicTitle: 'Делитесь музыкой',
  shareYourMusicSubtitle: 'Загружайте и публикуйте свои треки.',
  fanSupportTitle: 'Поддержка от фанатов',
  fanSupportSubtitle: 'Получайте поддержку напрямую от слушателей.',
  artistInsightsTitle: 'Аналитика артиста',
  artistInsightsSubtitle: 'Смотрите, как слушатели взаимодействуют с вашей музыкой.',
  becomeArtistCta: 'СТАТЬ АРТИСТОМ',
  toastInitializingArtistStudio: 'Настройка Artist Studio…',
  artistPhotoLabel: 'Фото артиста',
  stageNameLabel: 'Имя артиста / сценический псевдоним',
  stageNamePlaceholder: 'Ваш сценический псевдоним',
  primaryGenreLabel: 'Основной жанр',
  shortBioLabel: 'Краткая биография',
  shortBioPlaceholder: 'Расскажите слушателям о своём звучании',
  locationFieldLabel: 'Местоположение / город',
  locationFieldPlaceholder: 'Город, страна',
  createArtistProfileLabel: 'Создать профиль артиста',
  artistTermsDisclaimer: 'Создавая профиль, вы соглашаетесь с условиями Mmusic для артистов. Локальное демо — ничего не отправляется и не проверяется.',
  changeArtistPhotoLabel: 'Изменить фото артиста',
  addArtistPhotoLabel: 'Добавить фото артиста',
  trackPublishedTitle: 'Трек опубликован',
  viewPublicProfileLabel: 'Открыть публичный профиль',
  backToDashboardLabel: 'Назад в кабинет',
  uploadAudioLabel: 'Загрузить аудио',
  highQualityAudioFileHint: 'Аудиофайл высокого качества',
  browseFileLabel: 'Выбрать файл',
  trackDetailsLabel: 'Детали трека',
  trackTitleFieldLabel: 'Название трека',
  artistCollaboratorsLabel: 'Артист / приглашённые участники',
  optionalPlaceholder: 'Необязательно',
  genreFieldLabel: 'Жанр',
  coverArtworkLabel: 'Обложка трека',
  addHighQualityArtworkHint: 'Добавьте обложку высокого качества',
  chooseCoverLabel: 'Выбрать обложку',
  changeCoverLabel: 'Изменить обложку',
  coverInvalidType: 'Выберите изображение JPG, PNG или WebP',
  coverTooLarge: 'Изображение больше 10 МБ',
  coverUnreadable: 'Не удалось открыть это изображение',
  releaseSettingsLabel: 'Настройки релиза',
  scheduleReleaseLabel: 'Дата выпуска',
  releaseNowOptionLabel: 'Выпустить сейчас',
  scheduleOptionLabel: 'Запланировать',
  scheduleHintText: 'Планирование пока недоступно в этом демо — трек всё равно опубликуется сразу при нажатии «Опубликовать трек».',
  explicitContentLabel: 'Ненормативный контент',
  uploadingStatusLabel: 'Загрузка…',
  transcodingStatusLabel: 'Обработка…',
  publishErrorMessage: 'Не удалось опубликовать трек.',
  retryLabel: 'Повторить',
  publishTrackLabel: 'Опубликовать трек',
  saveAsDraftLabel: 'Сохранить как черновик',
  simulatePublishErrorLabel: 'Симулировать ошибку публикации (демо)',
  toastSavedAsDraft: 'Сохранено как черновик',

  demoAudioDescriptionHint: 'Эти треки воспроизводят лицензионное демо-аудио для тестирования плеера. Это не оригинальная запись.',
  licenceCcBy4Label: 'Лицензия (CC BY 4.0)',
  sourceIncompetechLabel: 'Источник: incompetech.com',
  nothingToConfirmMessage: 'Нечего подтверждать. Вернитесь и выберите сумму поддержки.',
  contributionAmountLabel: 'Сумма поддержки',
  mbankAccountMasked: 'Счёт MBANK •••• 4892',
  directWordLabel: 'Прямая',
  demoNoMoneySentLabel: 'Демо — деньги не отправляются',
  nothingRecentSupportMessage: 'Нет недавней поддержки для показа.',
  directPatronageCompleteLabel: 'Прямая поддержка завершена',
  demoNoMoneyWasSentLabel: 'Демо — деньги не были отправлены',
  viewSupportReceiptLabel: 'Посмотреть квитанцию в истории',

  // Universal MBANK Payment Widget (mbank-processing / mbank-result sheets)
  mbankWidgetProcessingTitle: 'Обработка платежа…',
  mbankWidgetProcessingHint: 'Это займёт всего мгновение.',
  mbankWidgetFailedTitle: 'Платёж не выполнен',
  mbankWidgetFailedHint: 'Демо-банк отклонил этот платёж. Вы можете попробовать снова.',
  mbankWidgetCancelledTitle: 'Платёж отменён',
  mbankWidgetCancelledHint: 'Вы отменили оплату до её завершения.',
  mbankWidgetSimulateDeclineLabel: 'Смоделировать отказ (демо)',
  mbankWidgetSubscriptionActivatedTitle: 'Тариф активирован',
  mbankWidgetPurchaseSuccessTitle: 'Покупка завершена',
  mbankWidgetReferenceLabel: 'Референс',

  mbankFloatingButtonLabel: 'MBANK Оплата (Демо)',
  mbankLauncherTitle: 'Оплата MBANK',
  mbankLauncherSubtitle: 'Выберите, за что хотите заплатить',
  mbankScenarioDonationTitle: 'Поддержка артиста',
  mbankScenarioDonationSubtitle: 'Прямая поддержка артиста',
  mbankScenarioStudioProTitle: 'Studio Pro',
  mbankScenarioStudioProSubtitle: 'Управление тарифом подписки',
  mbankScenarioPurchaseTitle: 'Общая покупка',
  mbankScenarioPurchaseSubtitle: 'Разовый демо-платёж',
  mbankPickArtistTitle: 'Выберите артиста',
  mbankPurchaseAmountTitle: 'Выберите сумму',
  mbankGeneralPurchaseDescription: 'Общая покупка (Демо)',
  continueLabel: 'Продолжить',

  decreaseCrossfadeLabel: 'Уменьшить кроссфейд',
  increaseCrossfadeLabel: 'Увеличить кроссфейд',
  qualityLowLabel: 'Низкое',
  qualityNormalLabel: 'Обычное',
  qualityHighLabel: 'Высокое',
  equalizerFlatLabel: 'Плоский',
  biometricActiveDemoLabel: 'Биометрия активна (демо)',
  disabledStatusLabel: 'Отключено',
  toastCacheCleared: 'Кэш очищен',

  downloadedMusicLabel: 'Загруженная музыка',
  nothingDownloadedHint: 'Пока ничего не загружено. Используйте «Загрузить» на альбоме или плейлисте, чтобы сохранить его здесь.',
  downloadsPreviewNote: 'Загрузки — предпросмотр, аудио пока не сохраняется на устройстве.',

  albumHeaderTitle: 'Альбом',
  playlistHeaderTitle: 'Плейлист',
  swipeExpandHint: 'Проведите вверх, чтобы развернуть, влево или вправо — чтобы сменить трек',
  audioQualityIntroText: 'Качество потока и настройки воспроизведения. Это предпросмотр — воспроизведение пока не меняется.',

  lyricsUnavailableDemoTitle: 'Текст недоступен для демо-аудио',
  lyricsUnavailableDemoHint: 'Эта демо-запись инструментальная.',
  lyricsUnavailableTitle: 'Текст недоступен',
  lyricsUnavailableHint: 'Синхронизированный текст для этого трека пока не добавлен.',
  sampleLyricsLabel: 'Примерный текст',
  sampleLyricsHint: 'Текст-заглушка для демо, а не официальная лирика.',

  artworkFallbackLabel: 'Обложка',
  openPlayerSwipeHint: 'Открыть плеер. Проведите влево для следующего трека, вправо — для предыдущего',
  swipeTrackHint: 'Проведите влево для следующего трека, вправо — для предыдущего',

  notifReleaseTitle: 'Новый релиз',
  notifReleaseBody: 'Solaris Echo выпустили Horizon (Deluxe).',
  notifReleaseTime: '2 ч назад',
  notifSupportTitle: 'Поддержка отправлена',
  notifSupportBody: 'Ваша поддержка 100 сом артисту Solaris Echo прошла успешно.',
  notifSupportTime: 'Вчера',
  notifPlaylistTitle: 'Плейлист обновлён',
  notifPlaylistBody: 'В Late Night Flow появились новые треки.',
  notifPlaylistTime: '2 дн назад',
  notifArtistTitle: 'В тренде',
  notifArtistBody: 'Kaelen набирает популярность в Electronic на этой неделе.',
  notifArtistTime: '4 дн назад',

  durationLateNightFlow: '19 мин',
  durationLateNightDriving: '3 ч 12 мин',
  durationLofiBeatsToCode: '7 ч 40 мин',
  durationElectronicEssentials: '4 ч 02 мин',
  durationThisIsSolarisEcho: '2 ч 48 мин',
  updatedLateNightFlow: 'Обновлено 2 ч назад',
  updatedLateNightDriving: 'Обновлено 1 дн назад',
  updatedElectronicEssentials: 'Обновлено 5 дн назад',

  nowPlayingEyebrowLabel: 'ИГРАЕТ СЕЙЧАС',
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

const GENRE_NAMES: Record<string, { en: string; ru: string }> = {
  'kyrgyz-music': { en: 'Kyrgyz Music', ru: 'Кыргызская музыка' },
  'made-for-you': { en: 'Made For You', ru: 'Для вас' },
  'charts-viral': { en: 'Charts & Viral', ru: 'Чарты и вирусное' },
  pop: { en: 'Pop', ru: 'Поп' },
  'hip-hop-rnb': { en: 'Hip-Hop & R&B', ru: 'Хип-хоп и R&B' },
  'electronic-dance': { en: 'Electronic & Dance', ru: 'Электроника и танцевальная' },
  'rock-indie': { en: 'Rock & Indie', ru: 'Рок и инди' },
  'jazz-soul': { en: 'Jazz & Soul', ru: 'Джаз и соул' },
  'chill-lofi': { en: 'Chill & Lo-Fi', ru: 'Чилл и лоу-фай' },
  'deep-focus-ambient': { en: 'Deep Focus & Ambient', ru: 'Фокус и эмбиент' },
  'workout-high-energy': { en: 'Workout & High Energy', ru: 'Тренировка и энергия' },
  'classical-film': { en: 'Classical & Film', ru: 'Классика и саундтреки' },
  'fresh-finds': { en: 'Fresh Finds', ru: 'Свежие находки' },
};

/** Discovery player's current-genre label. */
export function genreNameLabel(locale: 'en' | 'ru', genreId: string): string {
  return GENRE_NAMES[genreId]?.[locale] ?? genreId;
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

// --- Task 5 — final sweep helpers (dynamic/interpolated strings) ---

/** Demo Audio credit sheet's external link a11y label; `url` is data. */
export function externalLinkAccessibilityLabel(locale: 'en' | 'ru', label: string, url: string): string {
  return locale === 'ru' ? `${label}, открывает ${url}` : `${label}, opens ${url}`;
}

/** FeaturedBanner footer play button a11y label; `title` is data (track/playlist/album title). */
export function playPauseTrackLabel(locale: 'en' | 'ru', active: boolean, title: string): string {
  if (locale === 'ru') return `${active ? 'Пауза' : 'Включить'} ${title}`;
  return `${active ? 'Pause' : 'Play'} ${title}`;
}

/** Now Playing's lyric-preview a11y label; `label`/`text` are lyric data. */
export function lyricOpenAccessibilityLabel(locale: 'en' | 'ru', label: string, text: string): string {
  return locale === 'ru' ? `${label}: ${text}. Открыть текст песни` : `${label}: ${text}. Open lyrics`;
}

/** "Sort: {mode}" a11y label on the sort trigger; `modeLabel` is already localized by the caller. */
export function sortAccessibilityLabel(locale: 'en' | 'ru', modeLabel: string): string {
  return locale === 'ru' ? `Сортировка: ${modeLabel}` : `Sort: ${modeLabel}`;
}

/** "Sorted by {mode}" toast after cycling the sort order; `modeLabel` is already localized by the caller. */
export function sortedByToastLabel(locale: 'en' | 'ru', modeLabel: string): string {
  return locale === 'ru' ? `Сортировка: ${modeLabel}` : `Sorted by ${modeLabel}`;
}

/** Settings quality-row toast; `rowTitle`/`valueLabel` are already localized by the caller. */
export function qualityChangeToastLabel(locale: 'en' | 'ru', rowTitle: string, valueLabel: string): string {
  return locale === 'ru'
    ? `${rowTitle}: ${valueLabel} (предпросмотр — воспроизведение не меняется)`
    : `${rowTitle}: ${valueLabel} (preview — playback is unchanged)`;
}

/** Upload Track's publish-success message; `title` is the published track's title (data). */
export function trackPublishedMessage(locale: 'en' | 'ru', title: string): string {
  return locale === 'ru' ? `«${title}» теперь доступен на вашем профиле артиста.` : `"${title}" is now live on your artist profile.`;
}

/** Demo Audio credit sheet's "Plays as {title}" line; `title` is the catalog track's title (data). */
export function playsAsLabel(locale: 'en' | 'ru', title: string): string {
  return locale === 'ru' ? `Звучит как «${title}»` : `Plays as "${title}"`;
}

/** Demo Audio credit sheet's licence line; `licenseName` is data (e.g. "Creative Commons: By Attribution 4.0"). */
export function licensedUnderLabel(locale: 'en' | 'ru', licenseName: string): string {
  return locale === 'ru' ? `Лицензия: ${licenseName}` : `Licensed under ${licenseName}`;
}

/** Support Confirm's "Support {artist}" headline; `artistName` is data. */
export function supportTitleLabel(locale: 'en' | 'ru', artistName: string): string {
  return locale === 'ru' ? `Поддержать ${artistName}` : `Support ${artistName}`;
}

/** Support Confirm's CTA; `formattedAmount` is a formatted KGS amount (data), "сом" stays untranslated like every other KGS amount in the app. */
export function confirmAndSendLabel(locale: 'en' | 'ru', formattedAmount: string): string {
  return locale === 'ru' ? `Отправить ${formattedAmount} сом` : `Confirm & Send ${formattedAmount} сом`;
}

/** Support Success's "Supported {amount} {currency}" headline; `formattedAmount`/`currencyLabel` are data. */
export function supportedAmountHeadline(locale: 'en' | 'ru', formattedAmount: string, currencyLabel: string): string {
  return locale === 'ru' ? `Поддержано на ${formattedAmount} ${currencyLabel}` : `Supported ${formattedAmount} ${currencyLabel}`;
}

/** Playlist detail's "Curated by {curator}" line; `curatorName` is data. */
export function curatedByLabel(locale: 'en' | 'ru', curatorName: string): string {
  return locale === 'ru' ? `Куратор: ${curatorName}` : `Curated by ${curatorName}`;
}

/** Home stage's "Open player: {title} by {artist}" a11y label; both are track data. */
export function openPlayerAccessibilityLabel(locale: 'en' | 'ru', title: string, artistName: string): string {
  return locale === 'ru' ? `Открыть плеер: ${title}, ${artistName}` : `Open player: ${title} by ${artistName}`;
}

/** Downloads screen's "Remove download: {title}" a11y label; `title` is data. */
export function removeDownloadAccessibilityLabel(locale: 'en' | 'ru', title: string): string {
  return locale === 'ru' ? `Удалить загрузку: ${title}` : `Remove download: ${title}`;
}

/** Downloads screen's "Removed {title} from downloads" toast; `title` is data. */
export function removedFromDownloadsToast(locale: 'en' | 'ru', title: string): string {
  return locale === 'ru' ? `«${title}» удалено из загрузок` : `Removed ${title} from downloads`;
}

/** Mini-player's "Now playing: {title} by {artist}. Open player" a11y label; both are track data. */
export function nowPlayingAccessibilityLabel(locale: 'en' | 'ru', title: string, artistName: string): string {
  return locale === 'ru' ? `Сейчас играет: ${title}, ${artistName}. Открыть плеер` : `Now playing: ${title} by ${artistName}. Open player`;
}

/** RemovableChip's "Remove {label}" a11y label (e.g. a recent search term); `label` is data. */
export function removeItemAccessibilityLabel(locale: 'en' | 'ru', label: string): string {
  return locale === 'ru' ? `Удалить ${label}` : `Remove ${label}`;
}

/** ArtworkCarousel's "Artwork: {title}" a11y label; `title` is track data. */
export function artworkAccessibilityLabel(locale: 'en' | 'ru', title: string): string {
  return locale === 'ru' ? `Обложка: ${title}` : `Artwork: ${title}`;
}

/** QuickTile's "Play {title}" a11y label; `title` is data. */
export function playItemAccessibilityLabel(locale: 'en' | 'ru', title: string): string {
  return locale === 'ru' ? `Включить ${title}` : `Play ${title}`;
}

/** QuickTile's "More options for {title}" a11y label; `title` is data. */
export function moreOptionsForAccessibilityLabel(locale: 'en' | 'ru', title: string): string {
  return locale === 'ru' ? `Другие действия: ${title}` : `More options for ${title}`;
}
