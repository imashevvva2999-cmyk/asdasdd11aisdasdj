import { useEffect, useState } from 'react';
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
 * Only the page's first render is hydrated: components mounted later (a cover
 * opening Now Playing, a new list row) render the real image straight away
 * instead of flashing the placeholder for a frame (W3 Этап 1).
 */
let pageHydrated = false;

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(Platform.OS !== 'web' || pageHydrated);

  useEffect(() => {
    if (Platform.OS === 'web') {
      pageHydrated = true;
      setHydrated(true);
    }
  }, []);

  return hydrated;
}
