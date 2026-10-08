import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ColorValue } from 'react-native';

import { Colors } from '@/constants/theme';

export type IconProps = {
  /** Icon glyph name. Defaults to the `material` set (closest available match to
   * the Stitch source's "material-symbols-outlined" names); pass `set="community"`
   * for glyphs only available in MaterialCommunityIcons. Exact Material Symbols
   * Outlined glyphs are not bundled — see docs note in README for this folder. */
  name: string;
  set?: 'material' | 'community';
  size?: number;
  /** `ColorValue` (not just `string`) so this can take a React Navigation
   * `tabBarIcon`/`headerTintColor` color directly without a cast at the call site. */
  color?: ColorValue;
};

/**
 * The icon fonts. Loaded together with the text fonts in the root layout so an
 * icon renders the same glyph in the server-rendered web page and on the client:
 * @expo/vector-icons draws an empty <Text> until its font counts as loaded, which
 * made every icon a hydration mismatch (React #418) on the website.
 */
export const iconFonts = { ...MaterialIcons.font, ...MaterialCommunityIcons.font };

export function Icon({ name, set = 'material', size = 20, color = Colors.text.high }: IconProps) {
  if (set === 'community') {
    return <MaterialCommunityIcons name={name as never} size={size} color={color} />;
  }
  return <MaterialIcons name={name as never} size={size} color={color} />;
}
