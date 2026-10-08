import { useLayoutEffect, useMemo, useRef } from 'react';
import { interpolateColor, makeMutable, useReducedMotion, withSpring } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import { Spacing } from '@/constants/theme';
import { paletteForTrack, type ArtworkPalette } from '@/lib/palette';
import { fitArtworkSize, type Rect } from '@/lib/stage-math';
import { getTrackById } from '@/mocks';

import { playPosition, usePlayerStore } from './player-store';

/**
 * Shared animation state for the Dynamic Premium player
 * (docs/superpowers/specs/2026-10-08-player-gestures-plan.md §3–§5, §12).
 *
 * One continuous value drives the artwork carousel, the mini-player and both
 * adaptive backgrounds, so they can never disagree: `carouselPos` is the
 * position in PLAY ORDER (2.4 = 40% of the way from track #2 to #3). Covers sit
 * at fixed positions by play order, so a React re-render after a track change
 * never moves a cover that is already on screen (the Step 0 one-frame jump).
 */
export const CAROUSEL_SPRING = { stiffness: 260, damping: 28, mass: 1 };
export const carouselPos = makeMutable(0);
/** Where the carousel is heading; a gesture sets it before the store catches up. */
export const carouselTarget = makeMutable(0);
/** 0 = mini-player, 1 = full player (vertical expand/collapse). */
export const expandProgress = makeMutable(0);
/** A swipe up on the mini-player is drawing the in-place expand layer (plan §12.2). */
export const expandPreview = makeMutable(false);
/** Now Playing is the focused screen, so the mini-player under it fades with `expandProgress`. */
export const playerFocused = makeMutable(false);
/** The Home stage is on screen, so the capsule (mini-player) steps aside — the
 * playing track is never shown twice (W3 spec §2.5). */
export const stageVisible = makeMutable(false);
/** Where the Home stage's cover was (window coordinates) when it opened the
 * player — the cover grows from there into Now Playing. Null when unknown. */
export const stageCoverRect = makeMutable<Rect | null>(null);
/** Play-order length and repeat-all, mirrored for the UI-thread swipe gestures. */
export const orderLength = makeMutable(0);
export const repeatAll = makeMutable(false);

export const EXPAND_SPRING = { stiffness: 220, damping: 26, mass: 1 };
/** Reduce motion: settle without a spring. */
export const REDUCED_SETTLE_MS = 120;

/** Now Playing geometry, shared with the expand layer so both draw the cover in the same place. */
export const PLAYER_HEADER_HEIGHT = 56;
export const PLAYER_ARTWORK_TOP_GAP = Spacing.md;
/** The cover grows from this scale as the player expands. */
export const EXPAND_ART_SCALE_FROM = 0.6;
export function playerArtworkSize(contentWidth: number, windowHeight: number): number {
  // Stitch: artwork spans the content width (20px margins), capped at 340;
  // W3: smaller on short windows so the action row stays on screen.
  return fitArtworkSize(contentWidth, windowHeight);
}

/** Whether a swipe from play position `base` in direction `dir` has a track to land on. */
export function canStep(base: number, dir: 1 | -1): boolean {
  'worklet';
  const length = orderLength.value;
  if (repeatAll.value && length > 1) return true;
  // Positions keep counting across repeat-all laps; the edges repeat every `length`.
  const index = ((base % length) + length) % length;
  return dir > 0 ? index < length - 1 : index > 0;
}

/** The current track's carousel position: play order index, continuous across repeat-all laps. */
export function usePlayPosition(): number {
  return usePlayerStore(playPosition);
}

/**
 * Follows the store: when the track changes without a gesture (buttons, end
 * of track, Queue), the carousel glides to it — from one slot away for a long
 * jump. A gesture that already heads there is left alone. A new queue or
 * shuffle order snaps instantly. Mounted once, in the root layout.
 */
export function PlayerSurfaceSync() {
  const pos = usePlayPosition();
  const order = usePlayerStore((s) => s.order);
  const repeat = usePlayerStore((s) => s.repeat);
  const reduceMotion = useReducedMotion();
  const last = useRef({ pos, order });

  useLayoutEffect(() => {
    orderLength.value = order.length;
    repeatAll.value = repeat === 'all';
  }, [order.length, repeat]);

  useLayoutEffect(() => {
    const previous = last.current;
    last.current = { pos, order };
    const orderChanged = previous.order !== order;
    const lastPos = previous.pos;
    scheduleOnUI(() => {
      'worklet';
      if (orderChanged) {
        carouselTarget.value = pos;
        carouselPos.value = pos;
        return;
      }
      if (carouselTarget.value === pos) return;
      let start: number;
      if (carouselTarget.value !== lastPos) {
        // A gesture committed towards one position but the store landed on
        // another: keep the visual offset relative to the target.
        start = pos + (carouselPos.value - carouselTarget.value);
      } else {
        const delta = pos - lastPos;
        start = Math.abs(delta) <= 1 ? carouselPos.value : pos - Math.sign(delta);
      }
      carouselTarget.value = pos;
      carouselPos.value = start;
      carouselPos.value = reduceMotion ? pos : withSpring(pos, CAROUSEL_SPRING);
    });
  }, [pos, order, reduceMotion]);

  return null;
}

export type NeighborPalettes = {
  pos: number;
  prev: ArtworkPalette;
  current: ArtworkPalette;
  next: ArtworkPalette;
};

/** Palettes of the previous, current and next track in play order. */
export function useNeighborPalettes(): NeighborPalettes {
  const queue = usePlayerStore((s) => s.queue);
  const order = usePlayerStore((s) => s.order);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const repeat = usePlayerStore((s) => s.repeat);
  const pos = usePlayPosition();
  return useMemo(() => {
    const { prevId, nextId } = usePlayerStore.getState().peekNeighbors();
    const current = paletteForTrack(getTrackById(queue[currentIndex] ?? ''));
    return {
      pos,
      prev: prevId ? paletteForTrack(getTrackById(prevId)) : current,
      current,
      next: nextId ? paletteForTrack(getTrackById(nextId)) : current,
    };
    // repeat changes which neighbours exist at the queue edges.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, order, currentIndex, repeat, pos]);
}

/** Colour between the neighbours' palettes for the carousel position `p`. */
export function paletteColor(p: number, pos: number, prev: string, current: string, next: string): string {
  'worklet';
  return interpolateColor(p - pos, [-1, 0, 1], [prev, current, next]);
}
