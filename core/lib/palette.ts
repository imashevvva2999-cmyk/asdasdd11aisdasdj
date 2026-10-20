import { artworkPathsByMap, palettesByArtworkPath } from '../constants/artwork-palettes';

/**
 * Colours for the adaptive player (Dynamic Premium, docs/superpowers/specs/
 * 2026-10-08-player-gestures-plan.md §5), measured from the cover art by
 * scripts/generate-palettes.py and darkened until white text stays readable.
 * - background: full-player background (white text ≥ 5:1)
 * - deep: bottom of the full-player gradient
 * - mini: restrained mini-player tint (app surface + 22% background, ≥ 7:1)
 * - accent: subtle highlights (progress fill); coral stays the action colour
 */
export type ArtworkPalette = {
  background: string;
  deep: string;
  mini: string;
  accent: string;
};

/** For tracks without known artwork (user uploads, future remote covers). */
export const DEFAULT_PALETTE: ArtworkPalette = {
  background: '#463a5e',
  deep: '#211c2c',
  mini: '#1e1b25',
  accent: '#ff7a59',
};

/**
 * Same artwork priority as `mocks/tracks.ts`: the track's own Stitch art,
 * then its generated art, then its album's cover.
 */
export function paletteForTrack(track: { id: string; albumId?: string } | undefined): ArtworkPalette {
  if (!track) return DEFAULT_PALETTE;
  const albumPath = track.albumId
    ? (artworkPathsByMap.stitchArtworkByAlbumId[track.albumId] ?? artworkPathsByMap.generatedArtworkByAlbumId[track.albumId])
    : undefined;
  const path = artworkPathsByMap.stitchArtworkByTrackId[track.id] ?? artworkPathsByMap.generatedArtworkByTrackId[track.id] ?? albumPath;
  return (path !== undefined && palettesByArtworkPath[path]) || DEFAULT_PALETTE;
}

function relativeLuminance(hex: string): number {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two `#rrggbb` colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
