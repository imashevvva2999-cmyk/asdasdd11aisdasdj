/**
 * Nocturne Audio corner-radius scale (px). Source: DESIGN.md "Shapes" / YAML `rounded`.
 */
export const radii = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radii;
