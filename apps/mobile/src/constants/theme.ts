/**
 * Mmusic is dark-first / dark-only (DESIGN.md "Визуальный стиль"; OQ-34 — no light
 * theme planned). This module re-exports the single source of truth,
 * `@mmusic/design-tokens`, instead of maintaining a second copy of the palette —
 * do not add ad-hoc colors here.
 */

export { colors as Colors, typeScale as TypeScale, fontFamilies as Fonts, spacing as Spacing, radii as Radii } from '@mmusic/design-tokens';

export const MaxContentWidth = 800;
