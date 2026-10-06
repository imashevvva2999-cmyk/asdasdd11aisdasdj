/**
 * Nocturne Audio elevation/effects tokens. Source: DESIGN.md "Elevation & Depth" /
 * "Buttons & Interactive Controls" / "Chromatic Lighting".
 */
export const blur = {
  card: 24,
  overlay: 40,
  artworkGlow: 64,
} as const;

export const shadow = {
  /** Primary pill button glow (0 4px 20px rgba(255,75,75,.35)). */
  primaryButton: {
    offsetX: 0,
    offsetY: 4,
    blurRadius: 20,
    color: "rgba(255, 75, 75, 0.35)",
  },
} as const;

export const pressState = {
  scale: 0.96,
  durationMs: 150,
} as const;

export const artworkGlowOpacity = 0.3;
