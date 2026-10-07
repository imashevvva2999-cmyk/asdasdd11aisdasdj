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
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      setHydrated(true);
    }
  }, []);

  return hydrated;
}
