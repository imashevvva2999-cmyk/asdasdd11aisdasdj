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
import { ParticleWaveArtwork } from '@/components/ui/particle-wave/particle-wave-artwork';
import { DISCOVERY_ACTIVE_OFFSET_Y, DISCOVERY_FAIL_OFFSET_X, resolveSwipe, rubberBand } from '@/lib/gesture-math';
import { getTrackById, type TrackId } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';
import { CAROUSEL_SPRING, REDUCED_SETTLE_MS, canStep, carouselPos, carouselTarget, usePlayPosition } from '@/state/player-surface';

/**
 * Full-screen vertical swipe feed for the Late Night Flow discovery player —
 * swipe up for the next track, down for the previous one. Reuses the exact
 * same shared position/animation state and swipe-resolution math as the
 * horizontal `ArtworkCarousel` in Now Playing (just on the Y axis), so the
 * two never conflict: their `ArtworkCarousel`/`DiscoveryFeed` instances are
 * typically BOTH mounted at once under the root Stack, but only the topmost
 * screen's `GestureDetector` receives touches (standard React Navigation
 * touch-focus exclusivity) — the occluded screen's gesture simply never
 * fires. Nothing here duplicates playback state — `swipeTo` is the same call
 * Now Playing's own carousel makes.
 *
 * Only the CURRENT slide renders the reactive `ParticleWaveArtwork` (audio-
 * visualizer WebGL); the previous/next neighbour slides show a plain static
 * cover — showing three live WebGL contexts at once was a real performance
 * problem identified and fixed elsewhere in this app (Living Moods
 * prototype), and the neighbours are only glimpsed mid-drag here anyway.
 */
export function DiscoveryFeed({ size }: { size: { width: number; height: number } }) {
  const step = size.height;
  const reduceMotion = useReducedMotion();
  const pos = usePlayPosition();
  const queue = usePlayerStore((s) => s.queue);
  const order = usePlayerStore((s) => s.order);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const repeat = usePlayerStore((s) => s.repeat);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
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
        .activeOffsetY([-DISCOVERY_ACTIVE_OFFSET_Y, DISCOVERY_ACTIVE_OFFSET_Y])
        .failOffsetX([-DISCOVERY_FAIL_OFFSET_X, DISCOVERY_FAIL_OFFSET_X])
        .onStart(() => {
          cancelAnimation(carouselPos);
          dragStart.value = carouselPos.value;
        })
        .onUpdate((e) => {
          const base = carouselTarget.value;
          const canPrev = canStep(base, -1);
          const canNext = canStep(base, 1);
          // Swipe UP (negative translationY) moves to the NEXT track —
          // same sign convention as the horizontal carousel's "drag left = next".
          const raw = dragStart.value - e.translationY / step;
          const offset = rubberBand((base - raw) * step, canPrev, canNext);
          carouselPos.value = base - offset / step;
        })
        .onEnd((e) => {
          const base = carouselTarget.value;
          const canPrev = canStep(base, -1);
          const canNext = canStep(base, 1);
          const offset = (base - carouselPos.value) * step;
          const result = resolveSwipe(offset, e.velocityY, step, canPrev, canNext);
          const dir = result === 'next' ? 1 : result === 'prev' ? -1 : 0;
          const target = base + dir;
          carouselTarget.value = target;
          carouselPos.value = reduce.value
            ? withTiming(target, { duration: REDUCED_SETTLE_MS, easing: Easing.out(Easing.quad) })
            : withSpring(target, { ...CAROUSEL_SPRING, velocity: -e.velocityY / step });
          // Exactly one gesture → exactly one track: `dir` can only ever be
          // -1, 0, or 1 here (resolveSwipe's contract), so this can never
          // fire more than one `swipeTo` per released gesture.
          if (dir !== 0) scheduleOnRN(swipeTo, dir as 1 | -1);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step],
  );

  // Web-only: mouse-wheel / trackpad scroll, handled separately from the Pan
  // gesture above (wheel events are not pointer-drag events). A physical
  // trackpad swipe fires many small wheel events, including a long tail of
  // inertial/momentum events after the finger lifts — so this locks after the
  // FIRST wheel event that crosses the threshold, ignoring every subsequent
  // wheel event until WHEEL_IDLE_MS has passed with no new events (meaning the
  // physical gesture, including its momentum tail, has actually ended).
  const WHEEL_THRESHOLD = 24;
  const WHEEL_IDLE_MS = 220;
  const wheelLocked = useRef(false);
  const wheelIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWheel = useCallback(
    (e: { deltaY: number; preventDefault?: () => void }) => {
      if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current);
      wheelIdleTimer.current = setTimeout(() => {
        wheelLocked.current = false;
      }, WHEEL_IDLE_MS);
      if (wheelLocked.current) return;
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      const base = carouselTarget.value;
      if (!canStep(base, dir)) return;
      wheelLocked.current = true;
      const target = base + dir;
      carouselTarget.value = target;
      carouselPos.value = reduceMotion ? target : withSpring(target, CAROUSEL_SPRING);
      swipeTo(dir);
    },
    [reduceMotion, swipeTo],
  );

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateY: carouselPos.value * step }] }));

  const slots: { id: TrackId | undefined; at: number; current: boolean }[] = [
    { id: prevId, at: pos - 1, current: false },
    { id: currentId, at: pos, current: true },
    { id: nextId, at: pos + 1, current: false },
  ];

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ width: size.width, height: size.height }, styles.clip]} {...({ onWheel: handleWheel } as object)}>
        <Animated.View style={[StyleSheet.absoluteFill, stripStyle]}>
          {slots.map(({ id, at, current }) =>
            id ? <Slot key={`slot-${at}`} trackId={id} at={at} size={size} step={step} current={current} playing={isPlaying} /> : null,
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function Slot({
  trackId,
  at,
  size,
  step,
  current,
  playing,
}: {
  trackId: TrackId;
  at: number;
  size: { width: number; height: number };
  step: number;
  current: boolean;
  playing: boolean;
}) {
  const track = getTrackById(trackId);
  const style = useAnimatedStyle(() => ({ opacity: fade(carouselPos, at) }));
  return (
    <Animated.View style={[styles.slot, { width: size.width, height: size.height, top: at * step }, style]}>
      {current ? (
        <ParticleWaveArtwork uri={track?.coverUri ?? ''} trackId={trackId} playing={playing} />
      ) : (
        // Full-screen, not square: `Artwork`'s `size` alone produces a square
        // (height = size unless `aspectRatio` is given), so the neighbour
        // slide needs the real width/height ratio to fill the slot, and no
        // corner radius — this is a full-bleed background, not a card.
        <Artwork uri={track?.coverUri} size={size.width} aspectRatio={size.width / size.height} radius={0} />
      )}
    </Animated.View>
  );
}

function fade(p: SharedValue<number>, at: number): number {
  'worklet';
  return Math.min(1, Math.max(0, (1 - Math.abs(p.value - at)) * 4));
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  slot: { position: 'absolute', left: 0 },
});
