/**
 * The browser's localStorage, or null where there is none: native, static
 * rendering and Node — and browsers that block site data, where merely reading
 * `window.localStorage` throws a SecurityError. Callers fall back to their
 * no-op storage, so a blocked browser runs the app without persistence
 * instead of failing to load it.
 */
export function browserLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}
