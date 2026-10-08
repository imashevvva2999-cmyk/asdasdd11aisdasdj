import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * True immediately on native. On web, false during the server-rendered static
 * export pass and the browser's first paint, then true from the next effect
 * tick onward (Фаза 4 artwork restoration pass). `expo-image`'s web renderer
 * resolves a locally bundled `require()` asset differently inside Expo
 * Router's Node-based static-export pass than in a real browser — rendering
 * it unconditionally crashes React hydration ("Minified React error #418")
 * and blanks the whole route. Gating real-image rendering on this hook keeps
 * the first paint identical to the server markup (showing the existing
 * fallback placeholder), then swaps in the real artwork a tick after
 * hydration — invisible to a user, native unaffected.
 *
 * Built on `useSyncExternalStore`: React reads the server snapshot (false)
 * only while hydrating — including routes Expo Router hydrates lazily — and
 * re-renders once with the client value. Components mounted after hydration
 * (a cover opening Now Playing, a new list row) read the client value straight
 * away and show the real image without a placeholder frame (W3 Этап 1).
 */
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => Platform.OS !== 'web';

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
