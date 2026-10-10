import { create } from 'zustand';

import { DASHBOARD_STRINGS, type DashboardLocale, type DashboardStringKey } from '@/lib/dashboard-i18n';

type DashboardLocaleState = {
  locale: DashboardLocale;
  setLocale: (locale: DashboardLocale) => void;
};

/** Shared across all four Dashboard tabs (not persisted — session-local for
 * this first pass; real persistence lands with the Phase 5 i18next rollout,
 * docs/mmusic-task-tracker.md H-1). */
export const useDashboardLocaleStore = create<DashboardLocaleState>((set) => ({
  locale: 'en',
  setLocale: (locale) => set({ locale }),
}));

export function useDashboardStrings() {
  const locale = useDashboardLocaleStore((s) => s.locale);
  const setLocale = useDashboardLocaleStore((s) => s.setLocale);
  const t = (key: DashboardStringKey) => DASHBOARD_STRINGS[locale][key];
  return { locale, setLocale, t };
}
