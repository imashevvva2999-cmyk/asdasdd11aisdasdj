import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Artwork } from '@/components/ui';
import { Radii } from '@/constants/theme';
import { resolveSwipe, rubberBand } from '@/lib/gesture-math';
import { getTrackById, type TrackId } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';
import { CAROUSEL_SPRING, REDUCED_SETTLE_MS, canStep, carouselPos, carouselTarget, usePlayPosition } from '@/state/player-surface';

const GAP = 16;
const PAUSED_SCALE = 0.92;

/**
 * Horizontal artwork carousel (Dynamic Premium, plan §3, Step 0 findings §12):
 * drag the cover left for the next track, right for the previous one. The
 * cover follows the finger, neighbours appear only while dragging, a flick
 * decides by direction, a slow drag by distance, and an incomplete swipe
 * springs back. Committing calls the store's `swipeTo`, so the real track
 * changes (audio starts after a short settle).
 *
 * Covers sit at FIXED positions by play order and the strip moves by the
 * shared `carouselPos`, so a re-render after a track change never moves a
 * visible cover. The gesture is built once and reads its limits from shared
 * values — rebuilding it on render dropped touches in the spike.
 */
export function ArtworkCarousel({
  size,
  paused,
  onPress,
  onCoverLoad,
  insideScroll = false,
}: {
  size: number;
  paused: boolean;
  onPress?: () => void;
  /** The current cover's image has loaded. */
  onCoverLoad?: () => void;
  /** The cover sits in a vertically scrolling page (Home stage): on touch web
   * a vertical swipe that starts on it must scroll the page, so only the
   * horizontal axis is claimed (`touch-action: pan-y`). In Now Playing the
   * vertical drag belongs to the collapse gesture instead. */
  insideScroll?: boolean;
}) {
  const step = size + GAP;
  const reduceMotion = useReducedMotion();
  const pos = usePlayPosition();
  const queue = usePlayerStore((s) => s.queue);
  const order = usePlayerStore((s) => s.order);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const repeat = usePlayerStore((s) => s.repeat);
  const swipeTo = usePlayerStore((s) => s.swipeTo);

  const { prevId, nextId } = useMemo(
    () => usePlayerStore.getState().peekNeighbors(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue, order, currentIndex, repeat],
  );
  const currentId = queue[currentIndex];

  const reduce = useSharedValue(reduceMotion);
  useEffect(() => {
    reduce.value = reduceMotion;
  }, [reduceMotion, reduce]);

  const dragStart = useSharedValue(0);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-10, 10])
        .onStart(() => {
          cancelAnimation(carouselPos);
          dragStart.value = carouselPos.value;
        })
        .onUpdate((e) => {
          // Swipes in flight accumulate from the target, so fast flicks are never lost.
          const base = carouselTarget.value;
          const canPrev = canStep(base, -1);
          const canNext = canStep(base, 1);
          const raw = dragStart.value - e.translationX / step;
          const offset = rubberBand((base - raw) * step, canPrev, canNext);
          carouselPos.value = base - offset / step;
        })
        .onEnd((e) => {
          const base = carouselTarget.value;
          const canPrev = canStep(base, -1);
          const canNext = canStep(base, 1);
          const offset = (base - carouselPos.value) * step;
          const result = resolveSwipe(offset, e.velocityX, step, canPrev, canNext);
          const dir = result === 'next' ? 1 : result === 'prev' ? -1 : 0;
          const target = base + dir;
          carouselTarget.value = target;
          carouselPos.value = reduce.value
            ? withTiming(target, { duration: REDUCED_SETTLE_MS, easing: Easing.out(Easing.quad) })
            : withSpring(target, { ...CAROUSEL_SPRING, velocity: -e.velocityX / step });
          if (dir !== 0) scheduleOnRN(swipeTo, dir as 1 | -1);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step],
  );

  // Optional tap (the Home stage opens Now Playing): a tap only counts when the
  // pan did not start, so a swipe never also opens the player. The handler is
  // read through a ref, keeping the gesture itself built once.
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);
  const firePress = useCallback(() => onPressRef.current?.(), []);
  const tappable = onPress !== undefined;
  const gesture = useMemo(() => {
    if (!tappable) return pan;
    const tap = Gesture.Tap()
      .maxDistance(TAP_MAX_DISTANCE)
      .onEnd((_e, success) => {
        if (success) scheduleOnRN(firePress);
      });
    return Gesture.Exclusive(pan, tap);
  }, [pan, tappable, firePress]);

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -carouselPos.value * step }] }));

  const pausedScale = useSharedValue(paused ? PAUSED_SCALE : 1);
  useEffect(() => {
    const target = paused ? PAUSED_SCALE : 1;
    pausedScale.value = reduceMotion ? target : withTiming(target, { duration: 320, easing: Easing.out(Easing.back(1.4)) });
  }, [paused, reduceMotion, pausedScale]);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pausedScale.value }] }));

  const currentTitle = getTrackById(currentId ?? '')?.title ?? 'Artwork';
  const slots: { id: TrackId | undefined; at: number }[] = [
    { id: prevId, at: pos - 1 },
    { id: currentId, at: pos },
    { id: nextId, at: pos + 1 },
  ];

  return (
    <GestureDetector gesture={gesture} touchAction={insideScroll ? 'pan-y' : undefined}>
      <Animated.View
        style={[{ width: size, height: size }, styles.shadow, scaleStyle]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Artwork: ${currentTitle}`}
        accessibilityHint={
          tappable
            ? 'Open the player. Swipe left for the next track, right for the previous one'
            : 'Swipe left for the next track, right for the previous one'
        }
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, ...(tappable ? [{ name: 'activate' as const }] : [])]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') swipeTo(1);
          if (event.nativeEvent.actionName === 'decrement') swipeTo(-1);
          if (event.nativeEvent.actionName === 'activate') firePress();
        }}
        testID="artwork-carousel"
      >
        {/* Web: images are natively draggable (dragstart cancels the gesture), so the
            strip ignores pointers and the gesture container receives them. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, stripStyle]}>
          {slots.map(({ id, at }) =>
            id ? (
              <Slot key={`slot-${at}`} trackId={id} at={at} size={size} step={step} onLoad={at === pos ? onCoverLoad : undefined} />
            ) : null,
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

/** A press that moves further than this is a drag, not a tap. */
const TAP_MAX_DISTANCE = 8;

function Slot({ trackId, at, size, step, onLoad }: { trackId: TrackId; at: number; size: number; step: number; onLoad?: () => void }) {
  const track = getTrackById(trackId);
  // Visible only near the carousel position: neighbours appear while dragging.
  const style = useAnimatedStyle(() => ({ opacity: fade(carouselPos, at) }));
  return (
    <Animated.View style={[styles.slot, { width: size, height: size, left: at * step }, style]} testID={`carousel-slot-${trackId}`}>
      <Artwork uri={track?.coverUri} size={size} radius={Radii.lg} onLoad={onLoad} />
    </Animated.View>
  );
}

function fade(p: SharedValue<number>, at: number): number {
  'worklet';
  return Math.min(1, Math.max(0, (1 - Math.abs(p.value - at)) * 4));
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 14,
  },
  slot: {
    position: 'absolute',
    top: 0,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
});
