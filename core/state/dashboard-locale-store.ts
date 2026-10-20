import { DASHBOARD_STRINGS, type DashboardStringKey } from '../lib/dashboard-i18n';
import { useLocaleStore } from './locale-store';

/**
 * Thin adapter over the app-wide locale store (Settings > App Language —
 * see state/locale-store.ts). The Dashboard used to keep its own
 * session-local, unpersisted locale store; it now reads/writes the same
 * global, persisted one as every other screen, but keeps this exact
 * `useDashboardStrings()` shape so none of the four Dashboard tabs' call
 * sites need to change.
 */
export function useDashboardStrings() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = (key: DashboardStringKey) => DASHBOARD_STRINGS[locale][key];
  return { locale, setLocale, t };
}
