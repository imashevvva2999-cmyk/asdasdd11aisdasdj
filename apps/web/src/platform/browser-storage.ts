/**
 * The browser's localStorage, or null where there is none: browsers that block
 * site data, where merely reading `window.localStorage` throws a SecurityError.
 * The website then runs without persistence instead of failing to load (same
 * safeguard as the Expo app's src/platform/browser-storage.ts).
 */
export function browserLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}
