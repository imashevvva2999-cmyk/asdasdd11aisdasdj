import { createBrowserRouter, Navigate } from 'react-router';

import { HomePage } from '@/home/HomePage';
import { LibraryPage, NotFoundPage, ProfilePage, SearchPage } from '@/routes/pages';
import { AppShell } from '@/shell/AppShell';

// URLs mirror the Expo app (/home, /search, /library, /profile) for page-by-page parity checks later.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Development only (W2.4c-3): the audio start-up test bench. Outside the site shell and its navigation, loaded
  // lazily behind import.meta.env.DEV — production builds drop the route and its module entirely.
  ...(import.meta.env.DEV
    ? [{ path: '/dev/player', HydrateFallback: () => null, lazy: async () => ({ Component: (await import('@/dev/PlayerTestPage')).PlayerTestPage }) }]
    : []),
]);
