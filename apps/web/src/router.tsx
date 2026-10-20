import { createBrowserRouter, Navigate } from 'react-router';

import { browseShellRoutes } from '@/features/browse/routes';
import { playerFullscreenRoutes, playerShellRoutes } from '@/features/player/routes';
import { studioFullscreenRoutes, studioShellRoutes } from '@/features/studio/routes';
import { HomePage } from '@/home/HomePage';
import { NotFoundPage } from '@/routes/pages';
import { AppShell } from '@/shell/AppShell';

// URLs mirror the Expo app (apps/mobile/src/app). Each feature area owns its route list (src/features/*/routes.tsx):
// shell routes keep the site navigation and mini-player; full-screen routes (e.g. Discover) render on their own.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      ...browseShellRoutes,
      ...playerShellRoutes,
      ...studioShellRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  ...playerFullscreenRoutes,
  ...studioFullscreenRoutes,
  // Development only (W2.4c-3): the audio start-up test bench. Outside the site shell and its navigation, loaded
  // lazily behind import.meta.env.DEV — production builds drop the route and its module entirely.
  ...(import.meta.env.DEV
    ? [{ path: '/dev/player', HydrateFallback: () => null, lazy: async () => ({ Component: (await import('@/dev/PlayerTestPage')).PlayerTestPage }) }]
    : []),
]);
