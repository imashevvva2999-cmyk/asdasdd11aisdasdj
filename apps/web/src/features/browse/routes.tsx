import type { RouteObject } from 'react-router';

import { LibraryPage, ProfilePage, SearchPage } from '@/routes/pages';

/**
 * Search, Library, Profile and their detail routes (paths mirror the Expo app: apps/mobile/src/app).
 * Rendered inside the site shell (navigation + mini-player).
 */
export const browseShellRoutes: RouteObject[] = [
  { path: 'search', element: <SearchPage /> },
  { path: 'library', element: <LibraryPage /> },
  { path: 'profile', element: <ProfilePage /> },
];
