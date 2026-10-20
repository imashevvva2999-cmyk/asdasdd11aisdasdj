import { Link, useLocation } from 'react-router';

import { Icon } from '@mmusic/ui-kit/web';

import { useAppStrings } from '@/i18n/locale';

import './sheets/sheets.css';

/**
 * Floating MBANK payment button (mobile components/mbank/floating-payment-button.tsx): a round glass button,
 * bottom-right, opening the demo payment widget's scenario launcher. Hidden on full-screen playback, on any open
 * sheet (including the payment sheets themselves) and in the read-only guest preview — exactly like the app.
 * Mounted once by the site shell (AppShell).
 */
export function MbankButton() {
  const { pathname } = useLocation();
  const { t } = useAppStrings();
  if (pathname.startsWith('/player') || pathname.startsWith('/sheets') || pathname.startsWith('/demo')) return null;
  return (
    <Link className="mbank-fab glass" to="/sheets/mbank-launcher" aria-label={t('mbankFloatingButtonLabel')} title={t('mbankFloatingButtonLabel')}>
      <Icon name="account-balance" size={24} />
    </Link>
  );
}
