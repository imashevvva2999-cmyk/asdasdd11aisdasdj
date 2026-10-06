import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors } from '@/constants/theme';

export type IconProps = {
  /** Icon glyph name. Defaults to the `material` set (closest available match to
   * the Stitch source's "material-symbols-outlined" names); pass `set="community"`
   * for glyphs only available in MaterialCommunityIcons. Exact Material Symbols
   * Outlined glyphs are not bundled — see docs note in README for this folder. */
  name: string;
  set?: 'material' | 'community';
  size?: number;
  color?: string;
};

export function Icon({ name, set = 'material', size = 20, color = Colors.text.high }: IconProps) {
  if (set === 'community') {
    return <MaterialCommunityIcons name={name as never} size={size} color={color} />;
  }
  return <MaterialIcons name={name as never} size={size} color={color} />;
}
