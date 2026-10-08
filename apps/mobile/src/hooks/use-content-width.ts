import { useWindowSize } from './use-window-size';

/**
 * Widest the app's column gets. Mmusic is a mobile/WebView layout (DESIGN.md:
 * 390pt base); on a wide desktop browser the root layout centres the app in a
 * column this wide instead of stretching every screen edge to edge.
 */
export const MAX_CONTENT_WIDTH = 480;

/** Window width capped at the app column — use instead of the raw window
 * width when sizing grid tiles, heroes and artwork. */
export function useContentWidth(): number {
  return Math.min(useWindowSize().width, MAX_CONTENT_WIDTH);
}
