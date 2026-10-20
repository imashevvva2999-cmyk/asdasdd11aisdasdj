import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';

import { Icon, type IconName } from './Icon';

// W1 labels (RU default, as in the app); W2 moves them to the shared i18n strings.
const TABS: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/home', label: 'Главная', icon: 'home' },
  { to: '/search', label: 'Поиск', icon: 'search' },
  { to: '/library', label: 'Библиотека', icon: 'library-music' },
];
const PROFILE_LABEL = 'Профиль';

const BARS: Array<[height: number, durationMs: number, delayMs: number]> = [
  [0.45, 1100, 0],
  [0.75, 900, 180],
  [1, 1300, 90],
  [0.7, 1000, 320],
  [0.4, 1200, 140],
];

const tabClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'tab-link active' : 'tab-link');
const profileClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'profile-link active' : 'profile-link');

function Brand() {
  return (
    <Link to="/home" className="brand" aria-label="Mmusic — Главная">
      <span className="t-headline-md">Mmusic</span>
      <span className="brand-bars" aria-hidden="true">
        {BARS.map(([h, d, delay], i) => (
          <i key={i} style={{ height: h * 20, ['--d' as string]: `${d}ms`, ['--delay' as string]: `${delay}ms` }} />
        ))}
      </span>
    </Link>
  );
}

function ProfileLink({ size }: { size: number }) {
  return (
    <NavLink to="/profile" className={profileClass} aria-label={PROFILE_LABEL}>
      <Icon name="person" size={size} />
    </NavLink>
  );
}

export function AppShell() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <header className="site-head" data-scrolled={scrolled}>
        <div className="top-pill glass">
          <Brand />
          <span className="divider" aria-hidden="true" />
          <nav className="top-tabs" aria-label="Разделы">
            {TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} className={tabClass}>
                <Icon name={tab.icon} size={20} />
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>
          <ProfileLink size={22} />
        </div>
        <div className="mobile-head">
          <Brand />
          <ProfileLink size={24} />
        </div>
      </header>

      <main id="main" className="content" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="bottom-nav glass" aria-label="Разделы">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={tabClass}>
            <Icon name={tab.icon} size={22} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
