// First: configures @mmusic/core storage before the persisted locale store below is created.
import '@/platform/storage';

import { useAppStrings, useLocaleStore } from '@mmusic/core/state/locale-store';

import { WEB_STRINGS, type WebStringKey } from './web-strings';

/**
 * Website language (W3.0): the shared, persisted locale store (`mmusic:locale`, RU by default on a first visit)
 * and the shared app strings. The saved choice is loaded exactly once, when this module is first evaluated —
 * before the first render (the website is client-only; localStorage is synchronous), so a saved EN never flashes
 * Russian first. A run-once flag, not `persist.hasHydrated()` (which stays false after malformed saved data);
 * kept in Vite's hot data so a hot update does not load it again. `<html lang>` follows the language.
 */
type LocaleRuntime = { hydrated: boolean; unsubscribe?: () => void };
const runtime: LocaleRuntime = (import.meta.hot?.data.locale as LocaleRuntime | undefined) ?? { hydrated: false };
if (import.meta.hot) import.meta.hot.data.locale = runtime;

if (!runtime.hydrated) {
  runtime.hydrated = true;
  void useLocaleStore.persist.rehydrate();
}

const applyDocumentLanguage = () => {
  document.documentElement.lang = useLocaleStore.getState().locale;
};
applyDocumentLanguage();
// A re-evaluated instance (Vite HMR) replaces the previous subscription instead of adding a second one.
runtime.unsubscribe?.();
runtime.unsubscribe = useLocaleStore.subscribe(applyDocumentLanguage);

export { useAppStrings };

/** Website-only shell text (landmarks) in the current language. */
export function useWebStrings(): (key: WebStringKey) => string {
  const locale = useLocaleStore((s) => s.locale);
  return (key) => WEB_STRINGS[locale][key];
}
