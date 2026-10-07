import { Colors } from './theme';

/**
 * Deterministic fallback gradient pairs for artwork that has no real cover
 * image (Фаза 4 visual QA pass — docs/screens.md §0: no Stitch preview URL is
 * ever hot-linked, and no artwork is invented). No usable local image assets
 * exist in the Stitch export bundle (only full-page `screen.png` screenshots
 * and `code.html` files referencing temporary `lh3.googleusercontent.com`
 * URLs) — this is the "improved fallback" the visual QA pass asked for
 * instead: a tinted-glass tile in the existing brand palette, picked
 * deterministically from a seed string (usually the title) so the same
 * entity always renders the same tile instead of a plain flat-grey box.
 */
const GRADIENT_PAIRS: readonly (readonly [string, string])[] = [
  [withAlpha(Colors.primary, 0.35), Colors.surface.l3],
  [withAlpha(Colors.tertiary, 0.35), Colors.surface.l3],
  [withAlpha(Colors.secondary, 0.3), Colors.surface.l3],
  [Colors.surface.l3, withAlpha(Colors.primary, 0.3)],
  [Colors.surface.l3, withAlpha(Colors.tertiary, 0.3)],
  [Colors.surface.l2, withAlpha(Colors.secondary, 0.28)],
];

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hashString(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Picks a stable two-color gradient for `seed` (e.g. a track/album/genre title). */
export function getFallbackGradient(seed: string): readonly [string, string] {
  const index = hashString(seed) % GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[index]!;
}
