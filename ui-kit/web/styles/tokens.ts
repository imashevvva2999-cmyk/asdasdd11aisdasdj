import { colors, radii, spacing, typeScale, type TypeScaleToken } from '../../tokens';

const cssName = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** :root custom properties generated from the shared design tokens (single source of truth). */
export function tokenVariablesCss(): string {
  const vars: Record<string, string> = {
    '--canvas': colors.canvas,
    '--surface-l1': colors.surface.l1,
    '--surface-l2': colors.surface.l2,
    '--surface-l3': colors.surface.l3,
    '--primary': colors.primary,
    '--secondary': colors.secondary,
    '--tertiary': colors.tertiary,
    '--text-high': colors.text.high,
    '--text-medium': colors.text.medium,
    '--text-low': colors.text.low,
    '--border': colors.border,
  };
  for (const [key, value] of Object.entries(radii)) vars[`--radius-${cssName(key).toLowerCase()}`] = `${value}px`;
  for (const [key, value] of Object.entries(spacing)) vars[`--space-${cssName(key)}`] = `${value}px`;
  return `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;
}

/** One utility class per type-scale token, e.g. `.t-headline-md`. */
export function typeScaleCss(): string {
  return (Object.keys(typeScale) as TypeScaleToken[])
    .map((key) => {
      const t = typeScale[key];
      return `.t-${key}{font-family:"${t.fontFamily}",system-ui,sans-serif;font-size:${t.fontSize}px;font-weight:${t.fontWeight};line-height:${t.lineHeight}px;letter-spacing:${t.letterSpacing}px}`;
    })
    .join('');
}
