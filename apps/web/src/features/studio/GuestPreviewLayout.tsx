// First: configures @mmusic/core storage before the persisted demo-session store is used.
import '@/platform/storage';

import { useEffect } from 'react';
import { Link, Outlet } from 'react-router';

import { useIsGuestPreview } from '@mmusic/core/demo/guest-mode';
import { enterGuestPreview, exitGuestPreview } from '@mmusic/core/state/demo-session-store';
import { Brand } from '@mmusic/ui-kit/web';

import { Backdrop } from '@/components/Backdrop';
import { useAppStrings } from '@/i18n/locale';

import { Spinner, useDemoStrings, usePageTitle } from './kit';

/** A leave scheduled by an unmount; a re-mount in the same tick (React StrictMode) cancels it. */
let pendingExit: number | undefined;

/**
 * Public Guest Demo Preview — /demo/artist (mobile app/demo/_layout.tsx). Loads a fresh, immutable copy of the
 * Solaris Echo demo fixture into the in-memory app stores and switches on read-only mode (core demo/guest-mode: every
 * mutating store action is refused). Never reads or writes the personal demo account's storage, needs no login; the
 * website's start-up skips the personal restores under /demo. Leaving /demo clears the guest data again and restores
 * the visitor's own artist account (if any).
 */
export function GuestPreviewLayout() {
  const { d } = useDemoStrings();
  const { t } = useAppStrings();
  // Rendered once the guest data is loaded (the read-only flag is switched on together with it).
  const ready = useIsGuestPreview();
  usePageTitle(d.guestDashboardTitle);

  useEffect(() => {
    if (pendingExit !== undefined) {
      window.clearTimeout(pendingExit);
      pendingExit = undefined;
    } else {
      enterGuestPreview();
    }
    return () => {
      pendingExit = window.setTimeout(() => {
        pendingExit = undefined;
        exitGuestPreview();
      }, 0);
    };
  }, []);

  return (
    <>
      <Backdrop />
      <header className="st-guest-head">
        <Link to="/home" className="brand" aria-label={`Mmusic — ${t('homeTab')}`}>
          <Brand />
        </Link>
        <h1>{d.guestDashboardTitle}</h1>
      </header>
      <main id="main" className="st-guest-main" tabIndex={-1}>
        {ready ? <Outlet /> : <Spinner />}
      </main>
    </>
  );
}
