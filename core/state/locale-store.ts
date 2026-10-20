import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { APP_STRINGS, type AppStringKey } from '../lib/i18n';
import { platformStorage } from '../platform/storage';

export type AppLocale = 'en' | 'ru';

type LocaleState = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

/**
 * App-wide language preference (Settings > App Language). Defaults to
 * Russian for first-time users; a saved EN/RU choice persists across
 * reloads and always wins. Single source of truth every
 * screen (including the Artist Dashboard, which used to keep its own
 * session-local toggle) reads from.
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'ru',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'mmusic:locale',
      // Each app configures the backend (localStorage on web, none on
      // native/static rendering) before hydrating — see platform/storage.ts.
      storage: createJSONStorage(() => platformStorage),
      // Static web export pre-renders with the store's default ('ru');
      // rehydrating synchronously on module load would diverge from that
      // server HTML and trigger a React hydration mismatch. Skipping here
      // and rehydrating from a client-only effect (root _layout.tsx) keeps
      // the first paint SSR-safe — same pattern as usePlayerStore.
      skipHydration: true,
    },
  ),
);

/** App-wide string lookup — Home/Search/Library/Player/Profile/Settings/
 * Support. The Dashboard keeps using its own `useDashboardStrings()`
 * (state/dashboard-locale-store.ts), which now reads `locale` from this
 * same store. */
export function useAppStrings() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = (key: AppStringKey) => APP_STRINGS[locale][key];
  return { locale, setLocale, t };
}
