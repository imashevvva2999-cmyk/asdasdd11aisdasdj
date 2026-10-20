import { Text, type TextProps, type TextStyle } from 'react-native';

import { resolveFontFamily } from '@/constants/fonts';
import { Colors, TypeScale } from '@/constants/theme';
import type { TypeScaleToken } from '@mmusic/ui-kit/tokens';

export type ThemedTextProps = TextProps & {
  /** Nocturne Audio type-scale token (docs/screens.md §3.2). Defaults to body-md. */
  variant?: TypeScaleToken;
  /** Text emphasis per DESIGN.md "Typography & Icon Grayscale". Defaults to high. */
  emphasis?: 'high' | 'medium' | 'low' | 'primary';
};

export function ThemedText({ style, variant = 'body-md', emphasis = 'high', ...rest }: ThemedTextProps) {
  const token = TypeScale[variant];
  const color = emphasis === 'primary' ? Colors.primary : Colors.text[emphasis];

  const resolvedStyle: TextStyle = {
    color,
    fontFamily: resolveFontFamily(token.fontFamily, token.fontWeight),
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
  };

  return <Text style={[resolvedStyle, style]} {...rest} />;
}
