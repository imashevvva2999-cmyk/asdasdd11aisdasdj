import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { APP_STRINGS, type AppStringKey } from '@/lib/i18n';

export type AppLocale = 'en' | 'ru';

type LocaleState = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

/** No-ops on native (this app's persistence target is the web demo) and in any
 * environment without a real `localStorage` (SSR/tests), instead of throwing.
 * Same pattern as usePlayerStore's likedTrackIds persistence. */
const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const localeStorage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : noopStorage;

/**
 * App-wide language preference (Settings > App Language). Defaults to
 * English, persists across reloads, and is the single source of truth every
 * screen (including the Artist Dashboard, which used to keep its own
 * session-local toggle) reads from.
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'mmusic:locale',
      storage: createJSONStorage(() => localeStorage),
      // Static web export pre-renders with the store's default ('en');
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
 * (src/state/dashboard-locale-store.ts), which now reads `locale` from this
 * same store. */
export function useAppStrings() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = (key: AppStringKey) => APP_STRINGS[locale][key];
  return { locale, setLocale, t };
}
