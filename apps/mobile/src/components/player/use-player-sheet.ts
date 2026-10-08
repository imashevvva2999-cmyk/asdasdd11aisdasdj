import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useWindowSize } from '@/hooks/use-window-size';
import { collapseProgress, resolveCollapse } from '@/lib/gesture-math';
import { goBack } from '@/lib/navigation';
import {
  EXPAND_ART_SCALE_FROM,
  EXPAND_SPRING,
  REDUCED_SETTLE_MS,
  expandPreview,
  expandProgress,
  playerFocused,
} from '@/state/player-surface';

import { SHEET_TOP_RADIUS } from './expand-preview';

const COLLAPSE_MS = 260;
/** After a pull-down release the sheet is already low: finish quickly. */
const RELEASE_COLLAPSE_MS = 200;

/**
 * Now Playing as a sheet driven by the shared `expandProgress` (plan §4):
 * - opens from wherever the mini-player swipe left it (0 for a tap);
 * - a downward pull anywhere outside the cover and scrubber collapses it,
 *   following the finger, and springs back when released early;
 * - the collapse button, browser/Android Back and Escape (web) run the same
 *   collapse before the route is removed (`beforeRemove`).
 * Reduce motion: the sheet fades instead of sliding, except under the finger.
 */
export function usePlayerSheet() {
  const navigation = useNavigation();
  const { height } = useWindowSize();
  const reduceMotion = useReducedMotion();
  const dragging = useSharedValue(false);
  const allowRemove = useRef(false);
  const pendingAction = useRef<Parameters<typeof navigation.dispatch>[0] | undefined>(undefined);

  // Open: continue from the mini-player gesture (or from 0), then retire the
  // in-place layer once this screen has painted the same picture.
  useEffect(() => {
    expandProgress.value = reduceMotion ? withTiming(1, { duration: REDUCED_SETTLE_MS }) : withSpring(1, EXPAND_SPRING);
    const frame = requestAnimationFrame(() => {
      expandPreview.value = false;
    });
    return () => {
      cancelAnimationFrame(frame);
      expandPreview.value = false;
      expandProgress.value = 0;
    };
    // Mount only: re-running would restart the opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      playerFocused.value = true;
      return () => {
        playerFocused.value = false;
      };
    }, []),
  );

  const finishRemove = useCallback(() => {
    allowRemove.current = true;
    const action = pendingAction.current;
    pendingAction.current = undefined;
    if (action) {
      // Hand the action to the navigator it was aimed at (the root stack for
      // closing the player); dispatching it from this nested screen is ignored.
      const targetKey = typeof action === 'object' ? action.target : undefined;
      let target: typeof navigation | undefined = navigation;
      while (target && targetKey && target.getState()?.key !== targetKey) target = target.getParent();
      (target ?? navigation).dispatch(action);
    }
    else goBack();
  }, [navigation]);

  // Every way out (button, Back, Escape, router.back) collapses first.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (allowRemove.current) return;
        event.preventDefault();
        pendingAction.current = event.data.action;
        expandProgress.value = withTiming(
          0,
          { duration: reduceMotion ? REDUCED_SETTLE_MS : COLLAPSE_MS, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) scheduleOnRN(finishRemove);
          },
        );
      }),
    [navigation, reduceMotion, finishRemove],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && navigation.isFocused()) goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigation]);

  const collapse = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .failOffsetX([-16, 16])
        .onStart(() => {
          cancelAnimation(expandProgress);
          dragging.value = true;
        })
        .onUpdate((e) => {
          expandProgress.value = collapseProgress(e.translationY, height);
        })
        .onEnd((e) => {
          if (resolveCollapse(expandProgress.value, e.velocityY) === 'close') {
            // finishRemove marks the removal as allowed, so beforeRemove won't animate again.
            expandProgress.value = withTiming(
              0,
              { duration: reduceMotion ? REDUCED_SETTLE_MS : RELEASE_COLLAPSE_MS, easing: Easing.out(Easing.cubic) },
              (finished) => {
                if (finished) scheduleOnRN(finishRemove);
              },
            );
          } else {
            expandProgress.value = reduceMotion ? withTiming(1, { duration: REDUCED_SETTLE_MS }) : withSpring(1, EXPAND_SPRING);
          }
        })
        .onFinalize(() => {
          dragging.value = false;
        }),
    [height, reduceMotion, dragging, finishRemove],
  );

  const sheetStyle = useAnimatedStyle(() => {
    const p = expandProgress.value;
    if (reduceMotion && !dragging.value) {
      return { opacity: p, transform: [{ translateY: 0 }], borderTopLeftRadius: 0, borderTopRightRadius: 0 };
    }
    return {
      opacity: 1,
      transform: [{ translateY: (1 - p) * height }],
      borderTopLeftRadius: SHEET_TOP_RADIUS * (1 - p),
      borderTopRightRadius: SHEET_TOP_RADIUS * (1 - p),
    };
  });
  // Header, title, controls: appear late in the expansion, leave early on collapse.
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const artStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(expandProgress.value, [0, 1], [EXPAND_ART_SCALE_FROM, 1], Extrapolation.CLAMP) }],
  }));

  return { collapse, sheetStyle, chromeStyle, artStyle };
}
