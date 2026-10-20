// First: configures @mmusic/core storage before the persisted demo-session / dashboard-locale stores are used.
import '@/platform/storage';

import { Link, NavLink, Outlet } from 'react-router';

import { artistBase, useIsGuestPreview } from '@mmusic/core/demo/guest-mode';
import type { DashboardStringKey } from '@mmusic/core/lib/dashboard-i18n';
import { useArtistStore } from '@mmusic/core/state/artist-store';
import { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
import { useIsDemoArtist } from '@mmusic/core/state/demo-session-store';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { useAppStrings } from '@/i18n/locale';
import { Page, PageHeader } from '@/ui';

import { useDemoStrings, usePageTitle } from '../kit';

const TABS: { path: string; label: DashboardStringKey; icon: IconName }[] = [
  { path: '', label: 'overviewTab', icon: 'dashboard' },
  { path: '/analytics', label: 'analyticsTab', icon: 'show-chart' },
  { path: '/promotion', label: 'promotionTab', icon: 'campaign' },
  { path: '/studio-pro', label: 'studioProTab', icon: 'equalizer' },
];

/** Read-only guest preview banner ("ДЕМО-ПРОСМОТР"), or the signed-in demo account banner with its Manage link. */
export function DemoBanner() {
  const demo = useIsDemoArtist();
  const guest = useIsGuestPreview();
  const { d } = useDemoStrings();
  if (guest) {
    return (
      <div className="st-banner" role="note">
        <Icon name="visibility" size={14} />
        <span className="badge">{d.guestBadge}</span>
        <span className="text ellipsis">{d.guestBanner}</span>
        <span className="st-pill">
          <Icon name="lock" size={11} />
          {d.readOnly}
        </span>
      </div>
    );
  }
  if (!demo) return null;
  return (
    <div className="st-banner" role="note">
      <Icon name="science" size={14} />
      <span className="text ellipsis">{d.banner}</span>
      <Link to="/profile/demo-account">{d.manage}</Link>
    </div>
  );
}

/**
 * Artist Dashboard with its own tabs (mobile app/profile/artist/dashboard/_layout.tsx): Overview, Analytics,
 * Promotion, Studio Pro — independent from the site navigation. Shared by /profile/artist/dashboard and the guest
 * preview /demo/artist (read-only mode comes from the guest layout + guarded store actions).
 */
export function DashboardLayout() {
  const { t } = useAppStrings();
  const { t: dt } = useDashboardStrings();
  const guest = useIsGuestPreview();
  const artist = useArtistStore((s) => s.artist);
  const base = artistBase(guest).dashboard;
  usePageTitle(t('artistDashboardTitle'));

  const tabs = (
    <nav className="st-tabs" aria-label={t('artistDashboardTitle')}>
      {TABS.map((tab) => (
        <NavLink key={tab.label} to={`${base}${tab.path}`} end={tab.path === ''} className={({ isActive }) => (isActive ? 'st-tab active' : 'st-tab')}>
          <Icon name={tab.icon} size={20} />
          {dt(tab.label)}
        </NavLink>
      ))}
    </nav>
  );

  if (guest) {
    return (
      <>
        <DemoBanner />
        {tabs}
        <Outlet />
      </>
    );
  }

  return (
    <Page>
      <PageHeader
        title={t('artistDashboardTitle')}
        back="/profile"
        actions={
          artist ? (
            <Link className="icon-btn" to={`/artist/${artist.id}`} aria-label={t('viewPublicProfileLabel')} title={t('viewPublicProfileLabel')}>
              <Icon name="person" size={22} />
            </Link>
          ) : undefined
        }
      />
      <DemoBanner />
      {tabs}
      <Outlet />
    </Page>
  );
}
