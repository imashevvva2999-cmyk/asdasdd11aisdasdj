import { BlurView } from 'expo-blur';
import { forwardRef, useEffect, useMemo, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
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
  /** 'glass': a frosted, translucent panel over a lighter scrim (the player
   * stays visible), closed by dragging it down — the contextual player sheets. */
  variant?: 'default' | 'glass';
};

/** expo-blur blurs on iOS and the web; on Android (without its experimental
 * blur method) BlurView is only a translucent tint, so a translucent glass
 * panel would let the screen underneath show through its text. */
const BLUR_WORKS = Platform.OS !== 'android';

/** Drag distance or release speed that closes a glass sheet. */
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 800;

/**
 * Route-level bottom drawer for the `sheets/*` screens (presented as a
 * transparent modal in the root layout): a dimmed backdrop that closes on
 * tap, and a bottom-pinned Surface Level 1 panel with a 32px top radius,
 * hairline top highlight and drag handle — the Stitch sheet shape (S-18…S-21).
 * Height follows the content, capped at 90% of the screen.
 */
export function SheetScreen({ children, onDismiss, variant = 'default' }: SheetScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { t } = useAppStrings();
  const glass = variant === 'glass';
  const dismiss = onDismiss ?? (() => goBack());
  // Opening motion: the backdrop fades in while the panel rises into place.
  const open = useSharedValue(reduceMotion ? 1 : 0);
  // Glass sheets follow a downward drag; released far or fast enough, they close.
  const drag = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) open.set(withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [open, reduceMotion]);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: open.get() * (1 - Math.min(drag.get() / 400, 0.6)) }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - open.get()) * 48 + drag.get() }], opacity: 0.4 + open.get() * 0.6 }));

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(glass)
        .activeOffsetY(8)
        .onUpdate((e) => {
          drag.set(Math.max(0, e.translationY));
        })
        .onEnd((e) => {
          if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
            if (reduceMotion) {
              scheduleOnRN(dismiss);
              return;
            }
            drag.set(withTiming(600, { duration: 200, easing: Easing.in(Easing.quad) }, (finished) => finished && scheduleOnRN(dismiss)));
          } else {
            drag.set(reduceMotion ? 0 : withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) }));
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glass, reduceMotion, onDismiss],
  );

  return (
    <View style={sheetStyles.root}>
      <Animated.View style={[sheetStyles.scrimLayer, scrimStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('closeLabel')} style={[sheetStyles.scrim, glass && sheetStyles.scrimGlass]} onPress={dismiss} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[sheetStyles.panel, glass && (BLUR_WORKS ? sheetStyles.panelGlass : sheetStyles.panelGlassSolid), { paddingBottom: Math.max(insets.bottom, Spacing.lg) }, panelStyle]}
        >
          {glass && BLUR_WORKS && <BlurView intensity={blur.overlay} tint="dark" style={StyleSheet.absoluteFill} />}
          <View style={sheetStyles.handle} />
          {children}
        </Animated.View>
      </GestureDetector>
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
  scrimGlass: { backgroundColor: 'rgba(0, 0, 0, 0.32)' },
  panel: {
    maxHeight: '90%',
    backgroundColor: Colors.surface.l1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  // Frosted: the blur shows through a translucent surface (the website's .glass).
  panelGlass: { backgroundColor: 'rgba(20, 20, 24, 0.55)', borderColor: 'rgba(255, 255, 255, 0.14)' },
  // Android: the same dark glass colour, nearly opaque (no real blur there).
  panelGlassSolid: { backgroundColor: 'rgba(24, 24, 28, 0.97)', borderColor: 'rgba(255, 255, 255, 0.14)' },
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
