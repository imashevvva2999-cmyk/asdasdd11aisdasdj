import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';

import type { AppStringKey } from '@mmusic/core/lib/i18n';
import { Brand, Icon, type IconName } from '@mmusic/ui-kit/web';

import { startAudio } from '@/audio/web-audio';
import { useAppStrings, useWebStrings } from '@/i18n/locale';
import { MbankButton } from '@/features/studio/MbankButton';
import { MiniPlayer } from '@/player/MiniPlayer';

// Labels come from the shared app strings (RU by default, the saved language otherwise).
const TABS: Array<{ to: string; label: AppStringKey; icon: IconName }> = [
  { to: '/home', label: 'homeTab', icon: 'home' },
  { to: '/search', label: 'searchTab', icon: 'search' },
  { to: '/library', label: 'libraryTab', icon: 'library-music' },
];

const tabClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'tab-link active' : 'tab-link');
const profileClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'profile-link active' : 'profile-link');

function BrandLink() {
  const { t } = useAppStrings();
  return (
    <Link to="/home" className="brand" aria-label={`Mmusic — ${t('homeTab')}`}>
      <Brand />
    </Link>
  );
}

function ProfileLink({ size }: { size: number }) {
  const { t } = useAppStrings();
  return (
    <NavLink to="/profile" className={profileClass} aria-label={t('profileTitle')}>
      <Icon name="person" size={size} />
    </NavLink>
  );
}

export function AppShell() {
  const { t } = useAppStrings();
  const web = useWebStrings();
  const [scrolled, setScrolled] = useState(false);
  // Website audio for every page (W3.2): one <audio>, the shared engine + Media Session, liked tracks loaded once.
  useEffect(() => {
    startAudio();
  }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        {web('skipToContent')}
      </a>
      <header className="site-head" data-scrolled={scrolled}>
        <div className="top-pill glass">
          <BrandLink />
          <span className="divider" aria-hidden="true" />
          <nav className="top-tabs" aria-label={web('sectionsNav')}>
            {TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} className={tabClass}>
                <Icon name={tab.icon} size={20} />
                <span>{t(tab.label)}</span>
              </NavLink>
            ))}
          </nav>
          <ProfileLink size={22} />
        </div>
        <div className="mobile-head">
          <BrandLink />
          <ProfileLink size={24} />
        </div>
      </header>

      <main id="main" className="content" tabIndex={-1}>
        <Outlet />
      </main>

      <MiniPlayer />
      <MbankButton />

      <nav className="bottom-nav glass" aria-label={web('sectionsNav')}>
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={tabClass}>
            <Icon name={tab.icon} size={22} />
            <span>{t(tab.label)}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
