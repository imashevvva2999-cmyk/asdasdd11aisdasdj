import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { CAPSULE_GAP, PILL_BOTTOM_GAP, PILL_HEIGHT } from '@/components/nav/floating-tab-bar';
import { Blur, Colors, Radii } from '@/constants/theme';
import { useContentWidth } from '@/hooks/use-content-width';
import { useWindowSize } from '@/hooks/use-window-size';
import { TAP_MAX_DISTANCE } from '@/lib/gesture-math';
import { useAppStrings } from '@/state/locale-store';
import { CAROUSEL_SPRING } from '@/state/player-surface';
import { useFloatingButtonStore } from '@/state/floating-button-store';

const BUTTON_SIZE = 56;
const EDGE_MARGIN = 10;
const TOP_SAFE_GAP = 12;
/** Clears the floating tab pill AND the mini-player capsule above it (its own
 * height isn't exported anywhere, so this is a generous fixed allowance —
 * same conservative-clearance call as elsewhere in this component). */
const BOTTOM_SAFE_EXTRA = 96;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/**
 * Draggable floating MBANK payment button (AssistiveTouch-style) — opens the
 * universal payment widget's scenario launcher (sheets/mbank-launcher.tsx)
 * from anywhere in the app. Mounted once in the root layout so one instance
 * persists across every screen; position is clamped to the app's own capped-
 * width column (useContentWidth), not the raw browser window, and snaps to
 * the nearest left/right edge on release.
 */
export function FloatingPaymentButton() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const windowSize = useWindowSize();
  const contentWidth = useContentWidth();
  const reduceMotion = useReducedMotion();
  const { t } = useAppStrings();
  const side = useFloatingButtonStore((s) => s.side);
  const yFraction = useFloatingButtonStore((s) => s.yFraction);
  const setPosition = useFloatingButtonStore((s) => s.setPosition);

  // Fullscreen playback (player/*) and any open sheet (sheets/* — including
  // this widget's own payment modals) hide the button rather than drawing
  // over them.
  // Hidden in the read-only Guest Preview (/demo): no payments from there.
  const hidden = pathname.startsWith('/player') || pathname.startsWith('/sheets') || pathname.startsWith('/demo');
  // useWindowSize() reports a {0,0} server snapshot until the client hydrates
  // with the real size (see its own docs) — bounds computed from that would
  // collapse every axis to its minimum, flashing the button over the header
  // for a frame on every load. Stay invisible/non-interactive until it's real.
  const windowReady = windowSize.width > 0 && windowSize.height > 0;
  const visible = windowReady && !hidden;

  const minX = EDGE_MARGIN;
  const maxX = Math.max(minX, contentWidth - BUTTON_SIZE - EDGE_MARGIN);
  const minY = insets.top + TOP_SAFE_GAP;
  const maxY = Math.max(minY, windowSize.height - insets.bottom - PILL_BOTTOM_GAP - PILL_HEIGHT - CAPSULE_GAP - BOTTOM_SAFE_EXTRA - BUTTON_SIZE);

  const snappedX = side === 'right' ? maxX : minX;
  const snappedY = clamp(minY + yFraction * Math.max(1, maxY - minY), minY, maxY);

  const translateX = useSharedValue(snappedX);
  const translateY = useSharedValue(snappedY);
  const baseX = useSharedValue(snappedX);
  const baseY = useSharedValue(snappedY);
  const pressScale = useSharedValue(1);
  const opacity = useSharedValue(visible ? 1 : 0);

  // Re-settle when the persisted position rehydrates after mount, the stored
  // side/fraction changes, or the available bounds change (resize/rotation).
  useEffect(() => {
    baseX.value = snappedX;
    baseY.value = snappedY;
    translateX.value = reduceMotion || !windowReady ? snappedX : withSpring(snappedX, CAROUSEL_SPRING);
    translateY.value = reduceMotion || !windowReady ? snappedY : withSpring(snappedY, CAROUSEL_SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snappedX, snappedY, reduceMotion, windowReady]);

  useEffect(() => {
    opacity.value = reduceMotion ? (visible ? 1 : 0) : withTiming(visible ? 1 : 0, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  function openLauncher() {
    router.push('/sheets/mbank-launcher');
  }

  function persistPosition(nextSide: 'left' | 'right', clampedY: number) {
    const fraction = maxY > minY ? (clampedY - minY) / (maxY - minY) : 0;
    setPosition(nextSide, Math.min(1, Math.max(0, fraction)));
  }

  // minDistance gates the Pan so it only ever "claims" a real drag — a tap
  // (movement under TAP_MAX_DISTANCE) never activates it and falls through
  // to the Pressable below, RNGH's own documented pattern for combining a
  // draggable handle with a tappable child. That also doubles as the
  // accidental-click guard: once a drag has activated, the gesture responder
  // owns the touch and the Pressable's onPress never fires for it.
  const pan = Gesture.Pan()
    .enabled(visible)
    .minDistance(TAP_MAX_DISTANCE)
    .onBegin(() => {
      pressScale.value = reduceMotion ? 1.06 : withTiming(1.06, { duration: 120 });
    })
    .onUpdate((e) => {
      translateX.value = clamp(baseX.value + e.translationX, minX, maxX);
      translateY.value = clamp(baseY.value + e.translationY, minY, maxY);
    })
    .onEnd((e) => {
      const endX = clamp(baseX.value + e.translationX, minX, maxX);
      const endY = clamp(baseY.value + e.translationY, minY, maxY);
      const snapRight = endX + BUTTON_SIZE / 2 > contentWidth / 2;
      const targetX = snapRight ? maxX : minX;
      translateX.value = reduceMotion ? targetX : withSpring(targetX, CAROUSEL_SPRING);
      translateY.value = reduceMotion ? endY : withSpring(endY, CAROUSEL_SPRING);
      baseX.value = targetX;
      baseY.value = endY;
      runOnJS(persistPosition)(snapRight ? 'right' : 'left', endY);
    })
    .onFinalize(() => {
      pressScale.value = reduceMotion ? 1 : withTiming(1, { duration: 150 });
    });

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: pressScale.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.button, style]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mbankFloatingButtonLabel')}
          onPress={openLauncher}
          style={styles.pressable}
        >
          <BlurView intensity={Blur.overlay} tint="dark" style={styles.blur} />
          <Icon name="account-balance" size={24} color={Colors.secondary} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 20, 24, 0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 10,
    overflow: 'hidden',
    zIndex: 50,
  },
  pressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blur: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radii.full,
  },
});
