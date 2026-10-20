import { BlurView } from 'expo-blur';
import { forwardRef, useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { goBack } from '@/lib/navigation';
import { useAppStrings } from '@/state/locale-store';
import { blur } from '@mmusic/ui-kit/tokens';

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

export type SheetScreenProps = {
  children: ReactNode;
  /** Called when the dimmed backdrop is tapped. Defaults to closing the sheet. */
  onDismiss?: () => void;
};

/**
 * Route-level bottom drawer for the `sheets/*` screens (presented as a
 * transparent modal in the root layout): a dimmed backdrop that closes on
 * tap, and a bottom-pinned Surface Level 1 panel with a 32px top radius,
 * hairline top highlight and drag handle — the Stitch sheet shape (S-18…S-21).
 * Height follows the content, capped at 90% of the screen.
 */
export function SheetScreen({ children, onDismiss }: SheetScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { t } = useAppStrings();
  // Opening motion: the backdrop fades in while the panel rises into place.
  const open = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) open.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [open, reduceMotion]);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: open.value }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - open.value) * 48 }], opacity: 0.4 + open.value * 0.6 }));

  return (
    <View style={sheetStyles.root}>
      <Animated.View style={[sheetStyles.scrimLayer, scrimStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('closeLabel')}
          style={sheetStyles.scrim}
          onPress={onDismiss ?? (() => goBack())}
        />
      </Animated.View>
      <Animated.View style={[sheetStyles.panel, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }, panelStyle]}>
        <View style={sheetStyles.handle} />
        {children}
      </Animated.View>
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrimLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  panel: {
    maxHeight: '90%',
    backgroundColor: Colors.surface.l1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.text.low,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
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
