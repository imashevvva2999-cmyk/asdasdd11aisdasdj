import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { Artwork } from '@/components/ui';
import { ParticleWaveArtwork } from '@/components/ui/particle-wave/particle-wave-artwork';
import { resolveSwipe, rubberBand } from '@/lib/gesture-math';
import { getTrackIdsForGenre } from '@/lib/genre-tracks';
import { getTrackById, type TrackId } from '@/mocks';
import { usePlayerStore } from '@/state/player-store';
import { CAROUSEL_SPRING, REDUCED_SETTLE_MS, canStep, carouselPos, carouselTarget, usePlayPosition } from '@/state/player-surface';
import { canStepGenre, genrePos, genreTarget } from '@/state/discovery-surface';
import { useDiscoveryStore } from '@/state/discovery-store';

/**
 * Full-screen 2D pan feed for the Late Night Flow discovery player — vertical
 * swipes change the song within the current genre (unchanged math, reused
 * verbatim), horizontal swipes change the genre. A Pan gesture only decides
 * which axis it belongs to once the drag clears a small deadzone, then routes
 * every update for that gesture to ONLY that axis's shared values — the other
 * axis's shared values are never written to, so a vertical drag structurally
 * cannot change genres and vice versa.
 *
 * Reuses the exact same shared position/animation state and swipe-resolution
 * math as the horizontal `ArtworkCarousel` in Now Playing (song axis) and
 * mirrors it again for the genre axis — nothing here duplicates playback
 * state, `swipeTo` is the same call Now Playing's own carousel makes, and this
 * component only ever commits the genre INDEX (`setGenreIndex`), never track
 * playback.
 *
 * Only the CURRENT genre's CURRENT song renders the reactive
 * `ParticleWaveArtwork` (audio-visualizer WebGL); every other visible slot
 * (song neighbours, and the entire non-current genre slots) shows a plain
 * static cover — showing many live WebGL contexts at once was a real
 * performance problem identified and fixed elsewhere in this app (Living
 * Moods prototype).
 */
export function DiscoveryFeed({ size }: { size: { width: number; height: number } }) {
  const step = size.height;
  const width = size.width;
  const reduceMotion = useReducedMotion();
  const pos = usePlayPosition();
  const queue = usePlayerStore((s) => s.queue);
  const order = usePlayerStore((s) => s.order);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const repeat = usePlayerStore((s) => s.repeat);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const swipeTo = usePlayerStore((s) => s.swipeTo);

  const genreIds = useDiscoveryStore((s) => s.genreIds);
  const genreIndex = useDiscoveryStore((s) => s.genreIndex);
  const genreCount = genreIds.length;

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
  const genreDragStart = useSharedValue(0);
  const lockedAxis = useSharedValue<'x' | 'y' | null>(null);

  // Keeps `genrePos` glued to the store's `genreIndex` when it changes WITHOUT
  // a gesture (e.g. a future mount-time `setGenreById` call) — mirrors
  // `PlayerSurfaceSync`'s pattern in player-surface.ts. A gesture already
  // committed to the genre axis is left alone.
  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      if (lockedAxis.value === 'x') return;
      if (genreTarget.value === genreIndex) return;
      genreTarget.value = genreIndex;
      genrePos.value = reduce.value ? genreIndex : withSpring(genreIndex, CAROUSEL_SPRING);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreIndex]);

  const commitGenreChange = useCallback((dir: 1 | -1) => {
    const { genreIndex: current, genreIds: ids, setGenreIndex } = useDiscoveryStore.getState();
    setGenreIndex(Math.min(ids.length - 1, Math.max(0, current + dir)));
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .activeOffsetY([-12, 12])
        .onStart(() => {
          lockedAxis.value = null;
          cancelAnimation(carouselPos);
          cancelAnimation(genrePos);
          dragStart.value = carouselPos.value;
          genreDragStart.value = genrePos.value;
        })
        .onUpdate((e) => {
          if (lockedAxis.value === null) {
            if (Math.abs(e.translationX) + Math.abs(e.translationY) <= 4) return;
            lockedAxis.value = Math.abs(e.translationX) > Math.abs(e.translationY) ? 'x' : 'y';
          }
          if (lockedAxis.value === 'y') {
            const base = carouselTarget.value;
            const canPrev = canStep(base, -1);
            const canNext = canStep(base, 1);
            const raw = dragStart.value - e.translationY / step;
            const offset = rubberBand((base - raw) * step, canPrev, canNext);
            carouselPos.value = base - offset / step;
          } else if (lockedAxis.value === 'x') {
            const base = genreTarget.value;
            const canPrev = canStepGenre(base, -1, genreCount);
            const canNext = canStepGenre(base, 1, genreCount);
            const raw = genreDragStart.value - e.translationX / width;
            const offset = rubberBand((base - raw) * width, canPrev, canNext);
            genrePos.value = base - offset / width;
          }
        })
        .onEnd((e) => {
          if (lockedAxis.value === 'y') {
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
          } else if (lockedAxis.value === 'x') {
            const base = genreTarget.value;
            const canPrev = canStepGenre(base, -1, genreCount);
            const canNext = canStepGenre(base, 1, genreCount);
            const offset = (base - genrePos.value) * width;
            const result = resolveSwipe(offset, e.velocityX, width, canPrev, canNext);
            const dir = result === 'next' ? 1 : result === 'prev' ? -1 : 0;
            const target = base + dir;
            genreTarget.value = target;
            genrePos.value = reduce.value
              ? withTiming(target, { duration: REDUCED_SETTLE_MS, easing: Easing.out(Easing.quad) })
              : withSpring(target, { ...CAROUSEL_SPRING, velocity: -e.velocityX / width });
            if (dir !== 0) scheduleOnRN(commitGenreChange, dir as 1 | -1);
          }
          // lockedAxis.value === null: the gesture never cleared the deadzone
          // (a tap or negligible jitter) — nothing moves on either axis.
        })
        // Also covers a cancelled gesture (not just a clean release) — without
        // this, a completed 'x' gesture would leave lockedAxis stuck at 'x'
        // forever, silently blocking the genre-index-sync effect below from
        // ever reacting to a later EXTERNAL (non-gesture) genreIndex change.
        .onFinalize(() => {
          lockedAxis.value = null;
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, width, genreCount, commitGenreChange],
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
  // Mirrors the Pan gesture's `lockedAxis` shape, but kept as a separate
  // plain ref since `handleWheel` is a JS-thread callback, not a worklet —
  // sharing `lockedAxis` would need extra UI/JS plumbing not worth it here.
  const wheelAxisRef = useRef<'x' | 'y' | null>(null);
  const wheelIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWheel = useCallback(
    (e: { deltaX: number; deltaY: number; preventDefault?: () => void }) => {
      if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current);
      wheelIdleTimer.current = setTimeout(() => {
        wheelLocked.current = false;
        wheelAxisRef.current = null;
      }, WHEEL_IDLE_MS);
      // Ignores every event of an already-locked physical gesture (including
      // its momentum tail) on EITHER axis — same single-step-per-gesture
      // contract as before, just now covering both axes.
      if (wheelLocked.current) return;

      const axis: 'x' | 'y' = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? 'x' : 'y';
      wheelAxisRef.current = axis;
      const delta = axis === 'x' ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < WHEEL_THRESHOLD) return;
      const dir: 1 | -1 = delta > 0 ? 1 : -1;

      if (axis === 'y') {
        const base = carouselTarget.value;
        if (!canStep(base, dir)) return;
        wheelLocked.current = true;
        const target = base + dir;
        carouselTarget.value = target;
        carouselPos.value = reduceMotion ? target : withSpring(target, CAROUSEL_SPRING);
        swipeTo(dir);
      } else {
        const base = genreTarget.value;
        if (!canStepGenre(base, dir, genreCount)) return;
        wheelLocked.current = true;
        const target = base + dir;
        genreTarget.value = target;
        genrePos.value = reduceMotion ? target : withSpring(target, CAROUSEL_SPRING);
        commitGenreChange(dir);
      }
    },
    [reduceMotion, swipeTo, genreCount, commitGenreChange],
  );

  const genreStripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -genrePos.value * width }] }));

  const genreSlots = ([-1, 0, 1] as const)
    .map((offset) => {
      const at = genreIndex + offset;
      if (at < 0 || at >= genreIds.length) return null;
      return { genreId: genreIds[at], at, current: offset === 0 };
    })
    .filter((slot): slot is { genreId: string; at: number; current: boolean } => slot !== null);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ width: size.width, height: size.height }, styles.clip]} {...({ onWheel: handleWheel } as object)}>
        <Animated.View style={[StyleSheet.absoluteFill, genreStripStyle]}>
          {genreSlots.map(({ genreId, at, current }) => (
            <Animated.View key={`genre-${at}`} style={[styles.genreSlot, { width: size.width, height: size.height, left: at * size.width }]}>
              {current ? (
                <CurrentGenreSongs
                  prevId={prevId}
                  currentId={currentId}
                  nextId={nextId}
                  pos={pos}
                  size={size}
                  step={step}
                  isPlaying={isPlaying}
                />
              ) : (
                <GenrePreview genreId={genreId} size={size} />
              )}
            </Animated.View>
          ))}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

/** The existing vertical song carousel (prev/current/next SONG), unchanged in
 * its own logic — only the currently-centered genre mounts this. */
function CurrentGenreSongs({
  prevId,
  currentId,
  nextId,
  pos,
  size,
  step,
  isPlaying,
}: {
  prevId: TrackId | undefined;
  currentId: TrackId | undefined;
  nextId: TrackId | undefined;
  pos: number;
  size: { width: number; height: number };
  step: number;
  isPlaying: boolean;
}) {
  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -carouselPos.value * step }] }));

  // Defensive only — `genreIds` is the already-filtered, non-empty-only list
  // (Task 11's `getPlayableGenreIds`), so the current genre always has a
  // current track and this branch should never actually be reached.
  if (!currentId) return null;

  const slots: { id: TrackId | undefined; at: number; current: boolean }[] = [
    { id: prevId, at: pos - 1, current: false },
    { id: currentId, at: pos, current: true },
    { id: nextId, at: pos + 1, current: false },
  ];

  return (
    <Animated.View style={[StyleSheet.absoluteFill, stripStyle]}>
      {slots.map(({ id, at, current }) =>
        id ? <Slot key={`slot-${at}`} trackId={id} at={at} size={size} step={step} current={current} playing={isPlaying} /> : null,
      )}
    </Animated.View>
  );
}

/** A lightweight static preview for a genre that isn't centered — that
 * genre's first track's cover, no song-carousel mounted (performance: only
 * the current slide gets the expensive content). */
function GenrePreview({ genreId, size }: { genreId: string; size: { width: number; height: number } }) {
  const trackId = getTrackIdsForGenre(genreId)[0];
  // Defensive only — `genreIds` is pre-filtered to genres with at least one
  // track, so this should never actually be reached.
  if (!trackId) return null;
  const track = getTrackById(trackId);
  return <Artwork uri={track?.coverUri} size={size.width} aspectRatio={size.width / size.height} radius={0} />;
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
  const cover = Math.min(size.width * 0.74, 340, size.height * 0.42);
  return (
    <Animated.View style={[styles.slot, { width: size.width, height: size.height, top: at * step }, style]}>
      {current && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ParticleWaveArtwork uri={track?.coverUri ?? ''} trackId={trackId} playing={playing} />
        </View>
      )}
      <View style={styles.coverWrap} pointerEvents="none">
        <View style={styles.coverShadow}>
          <Artwork uri={track?.coverUri} size={cover} radius={16} />
        </View>
      </View>
    </Animated.View>
  );
}

function fade(p: SharedValue<number>, at: number): number {
  'worklet';
  return Math.min(1, Math.max(0, (1 - Math.abs(p.value - at)) * 4));
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  genreSlot: { position: 'absolute', top: 0, overflow: 'hidden' },
  slot: { position: 'absolute', left: 0 },
  coverWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  coverShadow: { borderRadius: 16, boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)' },
});
