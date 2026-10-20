import { Navigate, type RouteObject } from 'react-router';

import { DiscoverPage } from './DiscoverPage';
import { LyricsPage } from './LyricsPage';
import { NowPlayingPage } from './NowPlayingPage';
import { QueuePage } from './QueuePage';
import { PlayerLayout } from './shared';
import { TrackDeepLink } from './TrackDeepLink';

/**
 * Full player (now playing, queue, lyrics) and Discover. In the app these are full-screen modals over the tabs, so
 * on the website they are full-screen too (no site header / mini-player — the player has its own controls).
 * /track/:id is the deep-link target that opens Now Playing.
 */
export const playerShellRoutes: RouteObject[] = [];
export const playerFullscreenRoutes: RouteObject[] = [
  {
    path: '/player',
    element: <PlayerLayout />,
    children: [
      { index: true, element: <Navigate to="/player/now-playing" replace /> },
      { path: 'now-playing', element: <NowPlayingPage /> },
      { path: 'queue', element: <QueuePage /> },
      { path: 'lyrics', element: <LyricsPage /> },
      { path: 'discover', element: <DiscoverPage /> },
      { path: '*', element: <Navigate to="/player/now-playing" replace /> },
    ],
  },
  { path: '/track/:id', element: <TrackDeepLink /> },
];
