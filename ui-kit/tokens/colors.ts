/**
 * Nocturne Audio color tokens.
 *
 * Source of truth: `stitch_mmusic_mobile_streaming_app/nocturne_audio/DESIGN.md`,
 * "Colors" narrative section — per the decision recorded in `docs/screens.md` §3.1,
 * these values (not the Material-palette YAML frontmatter used by the raw Stitch
 * HTML exports) are canonical.
 */
export const colors = {
  canvas: "#0A0A0C",
  surface: {
    l1: "#141418",
    l2: "#1C1C24",
    l3: "#282834",
  },
  primary: "#FF4B4B",
  secondary: "#F5A623",
  tertiary: "#FF7A59",
  text: {
    high: "#FFFFFF",
    medium: "#9E9EA8",
    low: "#5A5A66",
  },
  border: "rgba(255, 255, 255, 0.08)",
  error: "#FF4B4B",
} as const;

export type Colors = typeof colors;
