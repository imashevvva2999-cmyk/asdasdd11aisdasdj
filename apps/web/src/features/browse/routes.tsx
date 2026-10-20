import type { RouteObject } from 'react-router';

import { AlbumPage, ArtistPage, CreatePlaylistPage, PlaylistPage } from './DetailPages';
import { LibraryPage, LikedSongsPage } from './LibraryPages';
import { AccountPage, AudioQualityPage, DemoAccountPage, DownloadsPage, LanguagePage, ProfilePage, SettingsPage, SupportHistoryPage } from './ProfilePages';
import { AllGenresPage, GenrePage, SearchPage, SearchResultsPage } from './SearchPages';

/**
 * Search, Library, Profile and their detail routes (paths mirror the Expo app: apps/mobile/src/app).
 * Rendered inside the site shell (navigation + mini-player).
 */
export const browseShellRoutes: RouteObject[] = [
  { path: 'search', element: <SearchPage /> },
  { path: 'search/results', element: <SearchResultsPage /> },
  { path: 'search/all-genres', element: <AllGenresPage /> },
  { path: 'search/genre/:id', element: <GenrePage /> },
  { path: 'library', element: <LibraryPage /> },
  { path: 'library/liked-songs', element: <LikedSongsPage /> },
  { path: 'album/:id', element: <AlbumPage /> },
  { path: 'artist/:id', element: <ArtistPage /> },
  { path: 'playlist/:id', element: <PlaylistPage /> },
  { path: 'create-playlist', element: <CreatePlaylistPage /> },
  { path: 'profile', element: <ProfilePage /> },
  { path: 'profile/settings', element: <SettingsPage /> },
  { path: 'profile/settings-language', element: <LanguagePage /> },
  { path: 'profile/audio-quality', element: <AudioQualityPage /> },
  { path: 'profile/downloads', element: <DownloadsPage /> },
  { path: 'profile/account', element: <AccountPage /> },
  { path: 'profile/support-history', element: <SupportHistoryPage /> },
  { path: 'profile/demo-account', element: <DemoAccountPage /> },
];
