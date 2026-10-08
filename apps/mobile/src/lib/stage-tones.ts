import { Colors } from '@/constants/theme';
import type { ArtworkPalette } from '@/lib/palette';

/**
 * Floating Canvas stage colours (W3, docs/superpowers/specs/
 * 2026-10-08-w3-floating-canvas-implementation.md §2.5): the cover colour
 * pulled 30 % towards the canvas at the top, then a fixed canvas-coloured
 * shade towards the bottom. Darkening only, so white text keeps ≥ 5:1.
 * No glow, no blur.
 */
function channel(hex: string, offset: number): number {
  return parseInt(hex.slice(offset, offset + 2), 16);
}

/** Linear mix of two `#rrggbb` colours; `t` = share of `b`, clamped to 0…1. */
export function mixHex(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const mixed = [1, 3, 5].map((offset) => Math.round(channel(a, offset) * (1 - k) + channel(b, offset) * k));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** The stage's top tone for a cover palette. */
export function stageTop(palette: ArtworkPalette): string {
  return mixHex(palette.background, Colors.canvas.toLowerCase(), 0.3);
}

/** Vertical shade over the stage top: the mid, deep and floor tones of the mockups. */
export const STAGE_SHADE = {
  colors: ['rgba(10, 10, 12, 0)', 'rgba(10, 10, 12, 0.45)', 'rgba(10, 10, 12, 0.7)', 'rgba(10, 10, 12, 0.82)'],
  locations: [0, 0.46, 0.78, 1],
} as const;

/** Edge vignette: the centre (cover, text) reads brighter than the edges. */
export const STAGE_VIGNETTE = {
  colors: ['rgba(8, 10, 16, 0.35)', 'rgba(8, 10, 16, 0)', 'rgba(8, 10, 16, 0)', 'rgba(8, 10, 16, 0.35)'],
  locations: [0, 0.22, 0.78, 1],
} as const;
