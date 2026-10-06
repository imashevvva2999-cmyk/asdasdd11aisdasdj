import { BlurView } from 'expo-blur';
import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Colors, Radii } from '@/constants/theme';
import { blur } from '@mmusic/design-tokens';

export type AppBottomSheetProps = {
  children: ReactNode;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
};

function renderBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6}>
      <BlurView intensity={blur.overlay} tint="dark" style={StyleSheet.absoluteFill} />
    </BottomSheetBackdrop>
  );
}

/**
 * Shared bottom-sheet shell (Track options, Add to Playlist, Support amount,
 * Donation confirmation, New Playlist — docs/screens.md §3.7). Requires
 * `GestureHandlerRootView` + `BottomSheetModalProvider` at the app root
 * (wired in src/app/_layout.tsx).
 */
export const AppBottomSheet = forwardRef<BottomSheetModal, AppBottomSheetProps>(function AppBottomSheet(
  { children, snapPoints, onDismiss },
  ref,
) {
  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      onDismiss={onDismiss}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      backdropComponent={renderBackdrop}
    >
      <View style={styles.content}>{children}</View>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.surface.l2,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
  },
  handle: {
    backgroundColor: Colors.text.low,
    width: 40,
  },
  content: {
    flex: 1,
  },
});
