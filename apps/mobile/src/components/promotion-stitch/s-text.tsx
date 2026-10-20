import { Text, type TextProps } from 'react-native';

import { TypeScale } from '@/constants/theme';
import type { TypeScaleToken } from '@mmusic/ui-kit/tokens';

import { S, sf, type StitchWeight } from './theme';

export type STextProps = TextProps & {
  /** Stitch `text-*` type token (same scale as the export's tailwind fontSize). */
  v?: TypeScaleToken;
  /** Stitch text color (defaults to `text-on-surface`). */
  color?: string;
  /** Tailwind `font-medium/semibold/bold/extrabold` override. */
  weight?: StitchWeight;
  /** Override font size (Tailwind `text-[13px]`), keeps the token's family. */
  size?: number;
};

/** Text rendered with the Stitch export's type token + color. */
export function SText({ v = 'body-md', color = S.onSurface, weight, size, style, ...rest }: STextProps) {
  const token = TypeScale[v];
  const family = token.fontFamily === 'Plus Jakarta Sans' ? 'display' : 'body';
  return (
    <Text
      style={[
        {
          color,
          fontFamily: sf(family, weight ?? (token.fontWeight as StitchWeight)),
          fontSize: size ?? token.fontSize,
          lineHeight: size ? Math.round(size * (token.lineHeight / token.fontSize)) : token.lineHeight,
          letterSpacing: token.letterSpacing,
        },
        style,
      ]}
      {...rest}
    />
  );
}
