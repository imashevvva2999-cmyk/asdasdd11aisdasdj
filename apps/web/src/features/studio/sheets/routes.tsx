import type { RouteObject } from 'react-router';

import { DemoAccountPage, DemoLoginPage } from './DemoAccountPages';
import { MbankLauncherDonatePage, MbankLauncherPage, MbankLauncherPurchasePage, MbankPayPage, MbankProcessingPage, MbankResultPage } from './MbankPages';
import { SupportConfirmPage, SupportPage, SupportSuccessPage } from './SupportPages';

/** Simulated support / MBANK sheets (mobile app/sheets/*) and the demo account pages (/profile/demo-*), inside the site shell. */
export const sheetShellRoutes: RouteObject[] = [
  { path: 'sheets/support', element: <SupportPage /> },
  { path: 'sheets/support-confirm', element: <SupportConfirmPage /> },
  { path: 'sheets/support-success', element: <SupportSuccessPage /> },
  { path: 'sheets/mbank-launcher', element: <MbankLauncherPage /> },
  { path: 'sheets/mbank-launcher-donate', element: <MbankLauncherDonatePage /> },
  { path: 'sheets/mbank-launcher-purchase', element: <MbankLauncherPurchasePage /> },
  { path: 'sheets/mbank-pay', element: <MbankPayPage /> },
  { path: 'sheets/mbank-processing', element: <MbankProcessingPage /> },
  { path: 'sheets/mbank-result', element: <MbankResultPage /> },
  { path: 'profile/demo-login', element: <DemoLoginPage /> },
  { path: 'profile/demo-account', element: <DemoAccountPage /> },
];
