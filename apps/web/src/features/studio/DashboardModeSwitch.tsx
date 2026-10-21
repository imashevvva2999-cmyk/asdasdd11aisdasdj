import { NavLink } from 'react-router';

import { Icon } from '@mmusic/ui-kit/web';

import { useAppStrings } from '@/i18n/locale';

/** Website preference: which dashboard "Кабинет артиста" opens. Only a mode flag — never any dashboard data. */
const MODE_KEY = 'mmusic:web-dashboard-mode';
export type DashboardMode = 'real' | 'demo';

const STRINGS = {
  ru: { label: 'Режим кабинета', real: 'Мой кабинет', demo: 'Demo Artist' },
  en: { label: 'Dashboard mode', real: 'My dashboard', demo: 'Demo Artist' },
} as const;

export function readDashboardMode(): DashboardMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === 'demo' ? 'demo' : 'real';
  } catch {
    return 'real';
  }
}

function saveDashboardMode(mode: DashboardMode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Blocked storage: the choice still applies for this navigation, it just is not remembered.
  }
}

/**
 * "Мой кабинет" / "Demo Artist" switch at the top of the Artist Dashboard. My dashboard is the user's own account
 * (/profile/artist/dashboard); Demo Artist is the existing read-only Solaris Echo guest preview (/demo/artist), whose
 * data is loaded into isolated in-memory stores and never touches personal storage. The choice is remembered, so
 * entering the dashboard again (or refreshing) opens the same mode until the user switches back.
 */
export function DashboardModeSwitch({ tab = '' }: { tab?: string }) {
  const { locale } = useAppStrings();
  const s = STRINGS[locale];
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'st-mode on' : 'st-mode');
  return (
    <nav className="st-modes" aria-label={s.label}>
      <NavLink to={`/profile/artist/dashboard${tab}`} className={cls} onClick={() => saveDashboardMode('real')}>
        <Icon name="person" size={18} />
        {s.real}
      </NavLink>
      <NavLink to={`/demo/artist${tab}`} className={cls} onClick={() => saveDashboardMode('demo')}>
        <Icon name="science" size={18} />
        {s.demo}
      </NavLink>
    </nav>
  );
}
