/**
 * Nocturne Audio spacing scale (px). Source: DESIGN.md "Layout & Spacing" / YAML `spacing`.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  gutter: 16,
  margin: 20,
  lg: 20,
  xl: 32,
  /** Bottom clearance reserved for the floating mini-player + tab bar stack
   * (80px tab bar + ~62px mini-player with 44px controls — visual fidelity
   * audit measurements, plus a little breathing room). */
  miniPlayerClearance: 150,
} as const;

export type SpacingToken = keyof typeof spacing;
