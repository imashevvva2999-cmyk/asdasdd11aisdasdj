// First: configures @mmusic/core storage before the persisted demo-session / locale stores are used.
import '@/platform/storage';

import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { useDemoSessionStore } from '@mmusic/core/state/demo-session-store';

import { EmptyState, ListRow, Page, PageHeader } from '@/ui';

import { ConfirmDialog, useDemoStrings, usePageTitle, useStudioToast } from '../kit';

/**
 * Demo artist login (mobile profile/demo-login.tsx). The app's dev-only credentials (demo-config, env hashes) never
 * reach the website, so this is always the honest "not available" state the app's production build shows.
 */
export function DemoLoginPage() {
  const { d } = useDemoStrings();
  usePageTitle(d.loginTitle);
  return (
    <Page narrow>
      <PageHeader title={d.loginTitle} back="/profile" />
      <EmptyState icon="lock" title={d.productionTitle} body={d.productionHint} />
    </Page>
  );
}

/** Demo artist account (mobile profile/demo-account.tsx): open the dashboard, reset the demo data or log out. */
export function DemoAccountPage() {
  const { d } = useDemoStrings();
  const active = useDemoSessionStore((s) => s.active);
  const resetDemo = useDemoSessionStore((s) => s.resetDemo);
  const signOut = useDemoSessionStore((s) => s.signOut);
  const [confirming, setConfirming] = useState(false);
  const { showToast, toast } = useStudioToast();
  const navigate = useNavigate();
  usePageTitle(d.accountTitle);

  if (!active) {
    return (
      <Page narrow>
        <PageHeader title={d.accountTitle} back="/profile" />
        <EmptyState icon="lock" title={d.accountTitle} body={d.settingsRowSignedOut}>
          <Link className="ui-btn" to="/profile/demo-login" replace>
            {d.signIn}
          </Link>
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page narrow>
      <PageHeader title={d.accountTitle} back="/profile" />
      <p className="t-body-md medium">{d.accountIntro}</p>
      <div className="ui-list">
        <ListRow icon="dashboard" title={d.openDashboard} to="/profile/artist/dashboard" />
        <ListRow icon="restart-alt" title={d.resetTitle} subtitle={d.resetHint} onClick={() => setConfirming(true)} />
        <ListRow
          icon="logout"
          title={d.logOut}
          onClick={() => {
            signOut();
            void navigate('/profile', { replace: true });
          }}
        />
      </div>
      {confirming && (
        <ConfirmDialog
          title={d.resetConfirmTitle}
          body={d.resetConfirmBody}
          confirmLabel={d.resetConfirm}
          cancelLabel={d.cancel}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            resetDemo();
            setConfirming(false);
            showToast(d.resetDone, 'check-circle');
          }}
        />
      )}
      {toast}
    </Page>
  );
}
