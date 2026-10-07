import { router, type Href } from 'expo-router';

/**
 * `router.back()` with a fallback. A modal/sheet opened directly by URL (web
 * refresh, deep link) has no screen beneath it, so a bare `router.back()`
 * silently does nothing ("GO_BACK was not handled"). Falls back to `fallback`
 * (Home by default) instead.
 */
export function goBack(fallback: Href = '/home'): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
