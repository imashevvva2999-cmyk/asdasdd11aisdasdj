import { resolveFontFamily } from '@/constants/fonts';

/**
 * Exact palette/radii/spacing from the Artist Promotion Stitch export's own
 * `tailwind.config` (stitch_artist-promotion/*\/code.html — identical in all 8
 * screens). Scoped to the Promotion flow only: the rest of the app keeps
 * `@mmusic/design-tokens`.
 */
export const S = {
  background: '#131315',
  surface: '#131315',
  surfaceDim: '#131315',
  surfaceBright: '#39393b',
  surfaceContainerLowest: '#0e0e10',
  surfaceContainerLow: '#1c1b1d',
  surfaceContainer: '#201f21',
  surfaceContainerHigh: '#2a2a2c',
  surfaceContainerHighest: '#353437',
  surfaceVariant: '#353437',
  onSurface: '#e5e1e4',
  onSurfaceVariant: '#e4bdba',
  onBackground: '#e5e1e4',
  inverseSurface: '#e5e1e4',
  inverseOnSurface: '#313032',
  outline: '#ab8886',
  outlineVariant: '#5b403e',
  surfaceTint: '#ffb3ae',
  primary: '#ffb3ae',
  onPrimary: '#68000b',
  primaryContainer: '#ff5351',
  onPrimaryContainer: '#5c0008',
  inversePrimary: '#bb1522',
  primaryFixed: '#ffdad7',
  primaryFixedDim: '#ffb3ae',
  onPrimaryFixed: '#410004',
  onPrimaryFixedVariant: '#930014',
  secondary: '#ffb955',
  onSecondary: '#452b00',
  secondaryContainer: '#dc9100',
  onSecondaryContainer: '#4f3100',
  secondaryFixed: '#ffddb4',
  secondaryFixedDim: '#ffb955',
  onSecondaryFixed: '#291800',
  onSecondaryFixedVariant: '#633f00',
  tertiary: '#ffb4a2',
  onTertiary: '#621100',
  tertiaryContainer: '#e96a4a',
  onTertiaryContainer: '#560e00',
  tertiaryFixed: '#ffdad2',
  tertiaryFixedDim: '#ffb4a2',
  onTertiaryFixed: '#3c0700',
  onTertiaryFixedVariant: '#862208',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  white: '#ffffff',
  black: '#000000',
} as const;

/** Tailwind radii as configured by the export (DEFAULT/lg/xl/full overridden;
 * 2xl/3xl are Tailwind defaults). */
export const SR = { none: 0, sm: 2, DEFAULT: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, full: 9999 } as const;

/** Export spacing tokens (margin/gutter/space-*) in px. */
export const SS = { xs: 4, sm: 8, md: 12, gutter: 16, margin: 20, lg: 20, xl: 32 } as const;

/** `#rrggbb` + opacity → rgba(), for Tailwind `bg-primary/20`-style classes. */
export function alpha(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export type StitchWeight = '400' | '500' | '600' | '700' | '800';

/** Font family for a Stitch `font-display`(Plus Jakarta Sans)/`font-body`(Inter)
 * + Tailwind weight class, resolved to the app's loaded font keys. */
export function sf(family: 'display' | 'body', weight: StitchWeight): string {
  return resolveFontFamily(family === 'display' ? 'Plus Jakarta Sans' : 'Inter', weight);
}
