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

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useContentWidth } from '@/hooks/use-content-width';
import { useWindowSize } from '@/hooks/use-window-size';
import { collapseProgress, resolveCollapse } from '@/lib/gesture-math';
import { goBack } from '@/lib/navigation';
import { clamp01, lerpRect, playerChromeOffset, playerChromeOpacity } from '@/lib/stage-math';
import {
  EXPAND_ART_SCALE_FROM,
  EXPAND_SPRING,
  REDUCED_SETTLE_MS,
  expandOrigin,
  expandPreview,
  expandProgress,
  playerCoverRect,
  playerFocused,
  stageCoverRect,
} from '@/state/player-surface';

import { SHEET_TOP_RADIUS } from './expand-preview';

const COLLAPSE_MS = 260;
/** Show the opening cover even if its image never reports loading. */
const ART_REVEAL_FALLBACK_MS = 300;

/** Opened from the Home stage with its cover's place known (else: the classic slide-up). */
function fromStage(): boolean {
  'worklet';
  return expandOrigin.value === 'stage' && stageCoverRect.value !== null;
}
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
  const { width, height } = useWindowSize();
  const contentWidth = useContentWidth();
  const insets = useSafeAreaInsets();
  // Where the cover ends up; the stage opening grows it there from the Home cover.
  const coverTarget = useMemo(
    () => playerCoverRect(width, contentWidth, height, insets.top),
    [width, contentWidth, height, insets.top],
  );
  const reduceMotion = useReducedMotion();
  const dragging = useSharedValue(false);
  // From the stage, this cover appears over the Home one only once its image can
  // paint (a new <img> decodes a frame or two late on web); the Home cover
  // beneath stands in until then. A safety timeout reveals it regardless.
  const artReady = useSharedValue(false);
  const markArtReady = useCallback(() => {
    artReady.value = true;
  }, [artReady]);
  useEffect(() => {
    const timer = setTimeout(markArtReady, ART_REVEAL_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [markArtReady]);
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
      expandOrigin.value = 'mini';
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
    if (fromStage()) {
      // The stage grows in place: nothing slides, the background fills in (backgroundStyle).
      return { opacity: 1, transform: [{ translateY: 0 }], borderTopLeftRadius: 0, borderTopRightRadius: 0 };
    }
    return {
      opacity: 1,
      transform: [{ translateY: (1 - p) * height }],
      borderTopLeftRadius: SHEET_TOP_RADIUS * (1 - p),
      borderTopRightRadius: SHEET_TOP_RADIUS * (1 - p),
    };
  });
  // From the stage, the player's colour fills in over the Home stage early in the motion.
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: fromStage() && !(reduceMotion && !dragging.value) ? clamp01(expandProgress.value * 3) : 1,
  }));
  // Header, title, controls: appear late in the expansion, leave early on collapse.
  const chromeStyle = useAnimatedStyle(() => {
    const p = expandProgress.value;
    if (fromStage()) return { opacity: playerChromeOpacity(p), transform: [{ translateY: playerChromeOffset(p) }] };
    return { opacity: interpolate(p, [0.55, 1], [0, 1], Extrapolation.CLAMP), transform: [{ translateY: 0 }] };
  });
  const artStyle = useAnimatedStyle(() => {
    const p = expandProgress.value;
    const from = stageCoverRect.value;
    if (fromStage() && from && !(reduceMotion && !dragging.value)) {
      // The Home cover grows into this one: same picture, one continuous move.
      const r = lerpRect(from, coverTarget, p);
      return {
        opacity: artReady.value ? 1 : 0,
        transform: [
          { translateX: r.x + r.width / 2 - (coverTarget.x + coverTarget.width / 2) },
          { translateY: r.y + r.height / 2 - (coverTarget.y + coverTarget.height / 2) },
          { scale: r.width / coverTarget.width },
        ],
      };
    }
    return {
      opacity: 1,
      transform: [
        { translateX: 0 },
        { translateY: 0 },
        { scale: interpolate(p, [0, 1], [EXPAND_ART_SCALE_FROM, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return { collapse, sheetStyle, backgroundStyle, chromeStyle, artStyle, markArtReady };
}
