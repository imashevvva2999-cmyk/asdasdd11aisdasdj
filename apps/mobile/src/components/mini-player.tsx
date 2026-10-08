import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { useSmoothProgress } from '@/hooks/use-smooth-progress';
import type { Track } from '@/mocks';
import { useWindowSize } from '@/hooks/use-window-size';
import { expandProgress as expandFor, lockAxis, resolveExpand, resolveSwipe, rubberBand } from '@/lib/gesture-math';
import { hasStartedPlayback } from '@/lib/stage-rules';
import { usePlayerStore } from '@/state/player-store';
import {
  CAROUSEL_SPRING,
  EXPAND_SPRING,
  REDUCED_SETTLE_MS,
  canStep,
  carouselPos,
  carouselTarget,
  expandOrigin,
  expandPreview,
  expandProgress,
  paletteColor,
  playerFocused,
  stageVisible,
  useNeighborPalettes,
} from '@/state/player-surface';

import { Artwork } from './ui/artwork';
import { ThemedText } from './themed-text';
import { EqualizerIndicator } from './ui/equalizer';
import { IconButton } from './ui/button';
import { PressableScale } from './ui/pressable-scale';

/**
 * Floating mini-player (DESIGN.md "Floating Mini-Player"; docs/screens.md
 * §3.1/§3.2/§3.10 "мини-плеер" — present on every main-tab Stitch screen but
 * not previously implemented). Mounted once in `(tabs)/_layout.tsx` so it
 * stays consistent across Home/Search/Library instead of being rebuilt per
 * screen. Reads the existing `usePlayerStore` (Фаза 4 Batch 2) — no new
 * playback state, no second player.
 *
 * Renders nothing when nothing has ever started playing (`currentTrack()` is
 * undefined on a cold load), matching Stitch's assumption that a track is
 * already queued.
 */
export function MiniPlayer({ respectStage = false }: { respectStage?: boolean }) {
  const track = usePlayerStore((s) => s.currentTrack());
  const started = usePlayerStore((s) => hasStartedPlayback(s.playback));
  // The seeded queue on a cold load is not playback: no capsule until something
  // has been played (W3 Этап 1, decision OQ-W3-2 — no fake playing state).
  if (!track || !started) {
    return null;
  }
  return <MiniPlayerBody track={track} respectStage={respectStage} />;
}

/** `respectStage`: the tabs' capsule steps aside for the Home stage; the
 * overlay on Artist / Album / Playlist has no stage to defer to. */
function MiniPlayerBody({ track, respectStage }: { track: Track; respectStage: boolean }) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playback = usePlayerStore((s) => s.playback);
  const progressSec = usePlayerStore((s) => s.progressSec);
  const engineDurationSec = usePlayerStore((s) => s.durationSec);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);
  const swipeTo = usePlayerStore((s) => s.swipeTo);
  const reduceMotion = useReducedMotion();
  const { height } = useWindowSize();

  const durationSec = engineDurationSec ?? track.durationSec;
  const progressRatio = durationSec > 0 ? Math.min(1, progressSec / durationSec) : 0;
  const unavailable = playback === 'unavailable';
  const progress = useSmoothProgress(progressRatio);
  // Same palette source as Now Playing, at mini strength (≥ 7:1 for white text).
  const palettes = useNeighborPalettes();
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: paletteColor(carouselPos.value, palettes.pos, palettes.prev.accent, palettes.current.accent, palettes.next.accent),
  }));
  const tintStyle = useAnimatedStyle(() => ({
    backgroundColor: paletteColor(carouselPos.value, palettes.pos, palettes.prev.mini, palettes.current.mini, palettes.next.mini),
  }));

  // Slides up into place the first time something plays; cross-fades the
  // cover + title when the track changes (both follow real store state).
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const trackFade = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) enter.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [enter, reduceMotion]);
  useEffect(() => {
    if (reduceMotion) return;
    trackFade.value = 0.2;
    trackFade.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
  }, [track.id, reduceMotion, trackFade]);
  // Steps aside while the Home stage shows the same track (W3: never shown twice).
  const stageHide = useDerivedValue(() =>
    withTiming(respectStage && stageVisible.value ? 0 : 1, { duration: reduceMotion ? 0 : STAGE_SWAP_MS }),
  );
  const [behindStage, setBehindStage] = useState(false);
  useAnimatedReaction(
    () => respectStage && stageVisible.value,
    (visible, previous) => {
      if (visible !== previous) scheduleOnRN(setBehindStage, visible);
    },
  );
  // Web: while the stage stands in for the capsule, its buttons must not be
  // reachable with Tab or a screen reader either — `inert` takes the whole
  // subtree out of focus and the accessibility tree (aria-hidden alone does not).
  const contentRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = contentRef.current as unknown as HTMLElement | null;
    if (!node) return;
    if (behindStage) node.setAttribute('inert', '');
    else node.removeAttribute('inert');
  }, [behindStage]);
  // Hidden under the full player while it expands/collapses (no double cover).
  const wrapStyle = useAnimatedStyle(() => {
    const underPlayer = playerFocused.value || expandPreview.value;
    const hide = underPlayer ? interpolate(expandProgress.value, [0, 0.25], [1, 0], Extrapolation.CLAMP) : 1;
    return { opacity: enter.value * hide * stageHide.value, transform: [{ translateY: (1 - enter.value) * 16 }] };
  });

  const openPlayer = useCallback(() => {
    // Web: the pressed mini-player keeps focus while the player hides it from
    // assistive tech (aria-hidden); release focus first.
    if (Platform.OS === 'web') (document.activeElement as HTMLElement | null)?.blur?.();
    expandOrigin.value = 'mini';
    router.push({ pathname: '/player/now-playing', params: { trackId: usePlayerStore.getState().currentTrackId() } });
  }, []);

  // A drag must not also count as a tap (web fires click after a pointer drag):
  // set when the pan starts, cleared shortly after it ends.
  const dragging = useRef(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const markDragStart = useCallback(() => {
    clearTimeout(clearTimer.current);
    dragging.current = true;
  }, []);
  const markDragEnd = useCallback(() => {
    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      dragging.current = false;
    }, DRAG_TAP_GUARD_MS);
  }, []);
  useEffect(() => () => clearTimeout(clearTimer.current), []);

  // Swipe gestures (plan §11a п. 4, Step 0 §12.2): ←/→ changes track, ↑ expands.
  // The axis locks on the first real movement; built once, limits read from shared values.
  const axis = useSharedValue<'x' | 'y' | 'none' | null>(null);
  const swipeBase = useSharedValue(0);
  const contentTx = useSharedValue(0);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(10)
        .onStart(() => {
          axis.value = null;
          scheduleOnRN(markDragStart);
        })
        .onUpdate((e) => {
          if (axis.value === null) {
            const locked = lockAxis(e.translationX, e.translationY);
            if (locked === 'x') {
              axis.value = 'x';
              cancelAnimation(carouselPos);
              swipeBase.value = carouselTarget.value;
            } else if (locked === 'y') {
              // Only an upward drag expands; a downward one is ignored.
              axis.value = e.translationY < 0 ? 'y' : 'none';
              if (axis.value === 'y') {
                expandOrigin.value = 'mini';
                cancelAnimation(expandProgress);
                expandProgress.value = 0;
                expandPreview.value = true;
              }
            }
          }
          if (axis.value === 'x') {
            const offset = rubberBand(e.translationX, canStep(swipeBase.value, -1), canStep(swipeBase.value, 1));
            contentTx.value = offset * 0.5;
            // The tint follows the finger, like the full player's background.
            carouselPos.value = swipeBase.value - offset / MINI_SWIPE_WIDTH;
          } else if (axis.value === 'y') {
            expandProgress.value = expandFor(e.translationY, height);
          }
        })
        .onEnd((e) => {
          if (axis.value === 'x') {
            const base = swipeBase.value;
            const offset = (base - carouselPos.value) * MINI_SWIPE_WIDTH;
            const result = resolveSwipe(offset, e.velocityX, MINI_SWIPE_WIDTH, canStep(base, -1), canStep(base, 1));
            const dir = result === 'next' ? 1 : result === 'prev' ? -1 : 0;
            carouselTarget.value = base + dir;
            carouselPos.value = reduceMotion
              ? withTiming(base + dir, { duration: REDUCED_SETTLE_MS })
              : withSpring(base + dir, CAROUSEL_SPRING);
            if (dir !== 0) scheduleOnRN(swipeTo, dir as 1 | -1);
          } else if (axis.value === 'y') {
            if (resolveExpand(expandProgress.value, e.velocityY) === 'open') {
              // Keep the layer moving; the route opens now and takes over at the same progress.
              expandProgress.value = withSpring(1, EXPAND_SPRING);
              scheduleOnRN(openPlayer);
            } else {
              expandProgress.value = withTiming(0, { duration: reduceMotion ? REDUCED_SETTLE_MS : 220 }, (finished) => {
                if (finished) expandPreview.value = false;
              });
            }
          }
        })
        .onFinalize((_, success) => {
          // A pan that never activated was a tap: nothing to guard.
          if (success || axis.value !== null) scheduleOnRN(markDragEnd);
          contentTx.value = reduceMotion ? 0 : withSpring(0, CAROUSEL_SPRING);
          axis.value = null;
        }),
    [axis, swipeBase, contentTx, height, reduceMotion, swipeTo, openPlayer, markDragStart, markDragEnd],
  );
  const trackStyle = useAnimatedStyle(() => ({
    opacity: trackFade.value * (1 - Math.min(0.6, Math.abs(contentTx.value) / 200)),
    transform: [{ translateX: contentTx.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
    <Animated.View
      style={[styles.wrap, tintStyle, wrapStyle]}
      pointerEvents={behindStage ? 'none' : 'auto'}
      accessibilityElementsHidden={behindStage}
      importantForAccessibility={behindStage ? 'no-hide-descendants' : 'auto'}
      testID="mini-player"
    >
      <View ref={contentRef}>
      <PressableScale
        // No button role: it contains real buttons (nested <button> is invalid on web).
        accessibilityLabel={`Now playing: ${track.title} by ${track.artistName}. Open player`}
        accessibilityHint="Swipe up to expand, left or right to change track"
        onPress={() => {
          if (dragging.current) return;
          openPlayer();
        }}
      >
        <View style={styles.row}>
          <Animated.View style={[styles.leftGroup, trackStyle]}>
            <Artwork uri={track.coverUri} size={44} radius={Radii.DEFAULT} style={styles.iconTile} />
            <View style={styles.textBlock}>
              <ThemedText variant="label-lg" numberOfLines={1}>
                {track.title}
              </ThemedText>
              <View style={styles.metaRow}>
                <ThemedText variant="body-sm" emphasis="medium" numberOfLines={1} style={styles.artistText}>
                  {track.artistName}
                </ThemedText>
                {isPlaying && <EqualizerIndicator size={12} />}
              </View>
            </View>
          </Animated.View>
          <View style={styles.actions}>
            <IconButton
              variant="ghost"
              icon="skip-next"
              iconSize={26}
              accessibilityLabel="Next track"
              onPress={(e) => {
                e.stopPropagation();
                next();
              }}
              size={44}
            />
            <IconButton
              icon={isPlaying ? 'pause' : 'play-arrow'}
              accessibilityLabel={unavailable ? 'Play (no audio in this preview)' : playback === 'loading' ? 'Loading. Pause' : isPlaying ? 'Pause' : 'Play'}
              disabled={unavailable}
              loading={playback === 'loading'}
              onPress={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              size={44}
              iconSize={24}
              style={styles.playButton}
            />
          </View>
        </View>
        {/* Progress as a thin palette line along the capsule's bottom edge (iphone/home-scrolled.png). */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </PressableScale>
      </View>
    </Animated.View>
    </GestureDetector>
  );
}

/**
 * The same mini-player for full screens outside the tab navigator (Artist,
 * Album, Playlist — Stitch shows it there too), pinned above the bottom safe
 * area instead of above the tab bar. Pair with `MINI_PLAYER_OVERLAY_CLEARANCE`
 * bottom padding on the screen's scroll content.
 */
export function MiniPlayerOverlay() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.overlaySlot, { bottom: insets.bottom + Spacing.sm }]} pointerEvents="box-none">
      <MiniPlayer />
    </View>
  );
}


/** A mini-player swipe of this many points equals one track (commit at 35 %). */
const MINI_SWIPE_WIDTH = 200;
/** How long after a drag a click is still treated as part of it. */
const DRAG_TAP_GUARD_MS = 300;
/** The capsule fades out/in as the Home stage leaves or returns. */
const STAGE_SWAP_MS = 160;

/** Scroll padding that keeps content clear of `MiniPlayerOverlay`. */
export const MINI_PLAYER_OVERLAY_CLEARANCE = 96;

const styles = StyleSheet.create({
  overlaySlot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  wrap: {
    position: 'absolute',
    left: Spacing.margin,
    right: Spacing.margin,
    bottom: 0,
    // Floating Canvas capsule (W3 Этап 1).
    borderRadius: Radii.full,
    overflow: 'hidden',
    // Opaque palette tint (animated, see tintStyle) so content scrolling
    // underneath doesn't read through; this is the fallback before first paint.
    backgroundColor: Colors.surface.l1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  progressTrack: {
    height: 2,
    backgroundColor: Colors.surface.l3,
  },
  progressFill: {
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    minWidth: 0,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surface.l1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  artistText: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  playButton: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.35,
    elevation: 6,
  },
});
