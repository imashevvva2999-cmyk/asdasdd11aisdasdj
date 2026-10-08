import { useSyncExternalStore } from 'react';
import { Dimensions, type ScaledSize } from 'react-native';

/** What the static web export renders with: there is no window on the server. */
const SERVER_WINDOW: ScaledSize = { width: 0, height: 0, scale: 1, fontScale: 1 };

function subscribe(onChange: () => void): () => void {
  const subscription = Dimensions.addEventListener('change', onChange);
  return () => subscription.remove();
}

const getWindow = (): ScaledSize => Dimensions.get('window');
const getServerWindow = (): ScaledSize => SERVER_WINDOW;

/**
 * `useWindowDimensions()` that hydrates cleanly on the website. The statically
 * rendered HTML is laid out without a window (0 × 0); hydrating with the real
 * size made window-dependent styles (tile widths, artwork, the player sheet)
 * differ from that HTML, and React keeps mismatched attributes as they were.
 * With the server snapshot, hydration sees the same size the HTML was built
 * with, then React re-renders once with the real window — the normal update
 * path, so every size-dependent style is applied. Native is unaffected.
 */
export function useWindowSize(): ScaledSize {
  return useSyncExternalStore(subscribe, getWindow, getServerWindow);
}
