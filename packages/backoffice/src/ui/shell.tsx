import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useStore } from 'zustand';

import { Brand, Icon, type IconName } from '@mmusic/ui-kit/web';

import type { Locale, Localized } from '../domain.ts';
import { can, type Permission } from '../rbac.ts';
import { useBackoffice, useLocale, useLocalized, useShellStrings } from '../react.tsx';

export type NavItem = { path: string; label: Localized; icon: IconName; permission: Permission };
export type NavGroup = { label: Localized; items: NavItem[] };

const COMPACT_QUERY = '(max-width: 1099px)';
const PHONE_QUERY = '(max-width: 767px)';

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/**
 * The back-office application shell (ARM and CRM): a sidebar with the app's sections (only those the current role may
 * open), and a top bar that always says what this is — a local prototype without authentication, with demo data —
 * plus the RU/EN switch, the development-only role switcher and "Сбросить демо-данные". Desktop: expanded sidebar;
 * tablet (<1100 px): icon rail; narrow screens (<768 px): off-canvas menu.
 */
export function AppShell({ nav }: { nav: NavGroup[] }) {
  const bo = useBackoffice();
  const s = useShellStrings();
  const l = useLocalized();
  const locale = useLocale();
  const roleId = useStore(bo.session, (st) => st.roleId);
  const compact = useMedia(COMPACT_QUERY);
  const phone = useMedia(PHONE_QUERY);
  const [expanded, setExpanded] = useState(!compact);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string>();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const location = useLocation();

  useEffect(() => setExpanded(!compact), [compact]);
  // The off-canvas menu closes after navigating on narrow screens.
  useEffect(() => {
    if (phone) setExpanded(false);
  }, [location.pathname, phone]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirming && !dialog.open) dialog.showModal();
    if (!confirming && dialog.open) dialog.close();
  }, [confirming]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.title = `${l(bo.appName)} — Mmusic`;
  }, [bo.appName, l]);

  const groups = nav.map((g) => ({ ...g, items: g.items.filter((item) => can(bo.matrix, roleId, item.permission)) })).filter((g) => g.items.length > 0);
  const reset = () => {
    bo.data.reset();
    setConfirming(false);
    setToast(s('resetDone'));
  };

  return (
    <div className="bo-app" data-expanded={expanded} data-phone={phone}>
      <a className="bo-skip" href="#bo-main">
        {s('skipToContent')}
      </a>
      {phone && expanded && <button type="button" className="bo-scrim" aria-label={s('collapse')} onClick={() => setExpanded(false)} />}
      <aside className="bo-side" aria-label={s('sections')}>
        <div className="bo-side-head">
          <span className="bo-brand">
            <Brand />
          </span>
          <span className="bo-app-name">{l(bo.appName)}</span>
          {/* Collapsed rail: the sound bars + the short app code (АРМ / CRM) instead of a clipped wordmark. */}
          <span className="bo-app-mark" aria-hidden="true">
            {l(bo.appName).split(' ')[0]}
          </span>
        </div>
        <nav className="bo-nav">
          {groups.map((group) => (
            <div key={group.label.en} className="bo-nav-group">
              <span className="bo-nav-group-label">{l(group.label)}</span>
              {group.items.map((item) => (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'bo-nav-link active' : 'bo-nav-link')} title={l(item.label)}>
                  <Icon name={item.icon} size={20} />
                  <span className="bo-nav-text">{l(item.label)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <p className="bo-side-foot">{s('demoDataNotice')}</p>
      </aside>

      <div className="bo-body">
        <header className="bo-top">
          <button type="button" className="bo-icon-btn" aria-label={expanded ? s('collapse') : s('expand')} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
            <Icon name={expanded && !phone ? 'menu-open' : 'menu'} size={22} />
          </button>
          <span className="bo-proto">
            <Icon name="lock-open" size={14} />
            {s('prototypeBadge')}
          </span>
          <span className="bo-top-spacer" />
          <div className="bo-seg" role="group" aria-label={s('language')}>
            {(['ru', 'en'] as Locale[]).map((code) => (
              <button key={code} type="button" className={code === locale ? 'on' : undefined} aria-pressed={code === locale} onClick={() => bo.locale.getState().setLocale(code)}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <label className="bo-role">
            <span className="bo-role-label">{s('role')}</span>
            <select value={roleId} title={`${s('role')} — ${s('roleProvisional')}`} onChange={(e) => bo.session.getState().setRole(e.target.value)}>
              {bo.roles.map((role) => (
                <option key={role.id} value={role.id} title={l(role.description)}>
                  {l(role.label)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="bo-btn ghost small" onClick={() => setConfirming(true)}>
            <Icon name="restart-alt" size={18} />
            <span className="bo-hide-narrow">{s('resetDemo')}</span>
          </button>
        </header>
        {bo.storage.mode === 'memory' && (
          <p className="bo-storage-note" role="status">
            <Icon name="warning-amber" size={16} />
            {s('storageMemory')}
          </p>
        )}
        <main id="bo-main" className="bo-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <dialog ref={dialogRef} className="bo-dialog" aria-labelledby="bo-reset-title" onClose={() => setConfirming(false)}>
        <h2 id="bo-reset-title">{s('resetConfirmTitle')}</h2>
        <p>{s('resetConfirmBody')}</p>
        <div className="bo-dialog-actions">
          <button type="button" className="bo-btn ghost" onClick={() => setConfirming(false)}>
            {s('cancel')}
          </button>
          <button type="button" className="bo-btn" onClick={reset}>
            {s('resetConfirm')}
          </button>
        </div>
      </dialog>
      {toast && (
        <output className="bo-toast">
          <Icon name="check-circle" size={18} />
          {toast}
        </output>
      )}
    </div>
  );
}
