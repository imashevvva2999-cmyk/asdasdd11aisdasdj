import { Navigate, type RouteObject } from 'react-router';

import { campaignShellRoutes, guestCampaignRoutes } from './campaign/routes';
import { AnalyticsTab } from './dashboard/AnalyticsTab';
import { DashboardLayout } from './dashboard/DashboardLayout';
import { OverviewTab } from './dashboard/OverviewTab';
import { PromotionTab } from './dashboard/PromotionTab';
import { StudioProTab } from './dashboard/StudioProTab';
import { GuestPreviewLayout } from './GuestPreviewLayout';
import { BecomeArtistPage } from './onboarding/BecomeArtistPage';
import { ArtistSetupPage } from './onboarding/ArtistSetupPage';
import { UploadTrackPage } from './onboarding/UploadTrackPage';
import { sheetShellRoutes } from './sheets/routes';

const dashboardTabs: RouteObject[] = [
  { index: true, element: <OverviewTab /> },
  { path: 'analytics', element: <AnalyticsTab /> },
  { path: 'promotion', element: <PromotionTab /> },
  { path: 'studio-pro', element: <StudioProTab /> },
];

/** Artist Studio (/profile/artist/*), the public guest preview (/demo/artist/*) and the simulated MBANK / support flows. */
export const studioShellRoutes: RouteObject[] = [
  { path: 'profile/artist/become-artist', element: <BecomeArtistPage /> },
  { path: 'profile/artist/setup', element: <ArtistSetupPage /> },
  { path: 'profile/artist/upload-track', element: <UploadTrackPage /> },
  { path: 'profile/artist/dashboard', element: <DashboardLayout />, children: dashboardTabs },
  ...campaignShellRoutes,
  ...sheetShellRoutes,
];

/** Public guest preview: outside the site shell (own header), read-only, never touching personal storage. */
export const studioFullscreenRoutes: RouteObject[] = [
  {
    path: '/demo',
    element: <GuestPreviewLayout />,
    children: [
      { index: true, element: <Navigate to="/demo/artist" replace /> },
      { path: 'artist', element: <DashboardLayout />, children: dashboardTabs },
      ...guestCampaignRoutes,
    ],
  },
];
