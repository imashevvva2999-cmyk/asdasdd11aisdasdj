import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Safe-area padding from the root provider, for the player screens. A native
 * SafeAreaView measures its own overlap with the screen's unsafe areas, but
 * the player opens as a sheet that starts a full screen height below the
 * screen (use-player-sheet.ts), inside a transparent modal: at mount it
 * overlaps nothing, reports a top inset of 0 (or late), and the header ended
 * up under the status bar / Dynamic Island. The provider's insets are the
 * screen's own and are the same ones the expand preview and the cover hand-off
 * (playerCoverRect) already use, so the artwork lines up with them.
 */
export function InsetSafeArea({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[{ paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }, style]}>{children}</View>;
}
