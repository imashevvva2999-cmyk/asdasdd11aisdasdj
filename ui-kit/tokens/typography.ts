/**
 * Nocturne Audio typography scale.
 *
 * Source: DESIGN.md YAML frontmatter `typography` block (matches `docs/screens.md` §3.2).
 * Two families: Plus Jakarta Sans (display/headline), Inter (body/label/mono-num).
 */
export const fontFamilies = {
  display: "Plus Jakarta Sans",
  body: "Inter",
} as const;

export const typeScale = {
  "display-lg": { fontFamily: fontFamilies.display, fontSize: 36, fontWeight: "800", lineHeight: 44, letterSpacing: -0.03 * 36 },
  "display-lg-mobile": { fontFamily: fontFamilies.display, fontSize: 28, fontWeight: "800", lineHeight: 34, letterSpacing: -0.025 * 28 },
  "headline-lg": { fontFamily: fontFamilies.display, fontSize: 24, fontWeight: "700", lineHeight: 30, letterSpacing: -0.02 * 24 },
  "headline-md": { fontFamily: fontFamilies.display, fontSize: 20, fontWeight: "600", lineHeight: 26, letterSpacing: -0.015 * 20 },
  "headline-sm": { fontFamily: fontFamilies.display, fontSize: 18, fontWeight: "600", lineHeight: 24, letterSpacing: -0.01 * 18 },
  "body-lg": { fontFamily: fontFamilies.body, fontSize: 16, fontWeight: "400", lineHeight: 24, letterSpacing: -0.01 * 16 },
  "body-md": { fontFamily: fontFamilies.body, fontSize: 14, fontWeight: "400", lineHeight: 20, letterSpacing: 0 },
  "body-sm": { fontFamily: fontFamilies.body, fontSize: 12, fontWeight: "400", lineHeight: 16, letterSpacing: 0.01 * 12 },
  "label-lg": { fontFamily: fontFamilies.body, fontSize: 14, fontWeight: "600", lineHeight: 18, letterSpacing: 0.01 * 14 },
  "label-md": { fontFamily: fontFamilies.body, fontSize: 12, fontWeight: "600", lineHeight: 16, letterSpacing: 0.02 * 12 },
  "label-sm": { fontFamily: fontFamilies.body, fontSize: 10, fontWeight: "700", lineHeight: 12, letterSpacing: 0.06 * 10 },
  "mono-num": { fontFamily: fontFamilies.body, fontSize: 11, fontWeight: "500", lineHeight: 14, letterSpacing: 0.04 * 11 },
} as const;

export type TypeScaleToken = keyof typeof typeScale;
