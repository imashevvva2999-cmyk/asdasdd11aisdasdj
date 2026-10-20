import type { RouteObject } from 'react-router';

import { CampaignConfirmPage } from './CampaignConfirmPage';
import { CampaignSetupPage } from './CampaignSetupPage';
import { CampaignStatisticsPage } from './CampaignStatisticsPage';
import { CampaignSuccessPage } from './CampaignSuccessPage';
import { PackageDetailsPage } from './PackageDetailsPage';
import { SelectPackagePage } from './SelectPackagePage';
import { SelectTrackPage } from './SelectTrackPage';

/** Promotion campaign wizard (mobile app/profile/artist/campaign/*), inside the site shell. Paths are absolute-from-root children of '/'. */
export const campaignShellRoutes: RouteObject[] = [
  { path: 'profile/artist/campaign/select-track', element: <SelectTrackPage /> },
  { path: 'profile/artist/campaign/select-package', element: <SelectPackagePage /> },
  { path: 'profile/artist/campaign/package-details', element: <PackageDetailsPage /> },
  { path: 'profile/artist/campaign/setup', element: <CampaignSetupPage /> },
  { path: 'profile/artist/campaign/confirm', element: <CampaignConfirmPage /> },
  { path: 'profile/artist/campaign/success', element: <CampaignSuccessPage /> },
  { path: 'profile/artist/campaign/statistics', element: <CampaignStatisticsPage /> },
];

/** Guest preview campaign screens (mobile app/demo/artist/campaign/*): children of the '/demo' route, relative paths ('artist/campaign/...'). */
export const guestCampaignRoutes: RouteObject[] = [
  { path: 'artist/campaign/select-package', element: <SelectPackagePage /> },
  { path: 'artist/campaign/package-details', element: <PackageDetailsPage /> },
  { path: 'artist/campaign/statistics', element: <CampaignStatisticsPage /> },
];
