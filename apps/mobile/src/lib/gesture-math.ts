/**
 * Decisions for the player gestures (docs/superpowers/specs/2026-10-08-player-
 * gestures-plan.md §3, §4, §12). Pure functions marked as worklets so gesture
 * handlers can call them on the UI thread; covered by scripts/verify-gesture-math.mjs.
 */

/** A release faster than this (pt/s) is a flick: the finger's direction decides. */
export const FLICK_VELOCITY = 600;
/** A slow drag commits after this share of the slot width. */
export const COMMIT_DISTANCE = 0.35;
/** Drag past a queue edge moves the cover this fraction of the finger. */
export const EDGE_RESISTANCE = 0.3;
/** Pixels of movement before a gesture's axis is decided. */
export const AXIS_LOCK_DISTANCE = 6;
/** A vertical drag of this share of the screen height means fully open/closed. */
export const VERTICAL_TRAVEL = 0.75;
export const VERTICAL_FLICK_VELOCITY = 700;
export const EXPAND_COMMIT = 0.3;
export const COLLAPSE_KEEP_OPEN = 0.75;

export type SwipeResult = 'next' | 'prev' | 'cancel';

/**
 * Horizontal artwork swipe on release. `offset` < 0 means dragged left
 * (towards the next track). A flick decides by direction — the cover may still
 * be mid-snap from a previous swipe, so its position alone would mislead.
 */
export function resolveSwipe(offset: number, velocity: number, width: number, canPrev: boolean, canNext: boolean): SwipeResult {
  'worklet';
  const flick = Math.abs(velocity) > FLICK_VELOCITY;
  const wantsNext = flick ? velocity < 0 : offset < -width * COMMIT_DISTANCE;
  const wantsPrev = flick ? velocity > 0 : offset > width * COMMIT_DISTANCE;
  if (wantsNext && canNext) return 'next';
  if (wantsPrev && canPrev) return 'prev';
  return 'cancel';
}

/** Resistance when dragging towards a side with no track. */
export function rubberBand(offset: number, canPrev: boolean, canNext: boolean): number {
  'worklet';
  if ((offset < 0 && !canNext) || (offset > 0 && !canPrev)) return offset * EDGE_RESISTANCE;
  return offset;
}

/** Decide the gesture axis on the first real movement (start events can report 0,0 on web). */
export function lockAxis(dx: number, dy: number, threshold = AXIS_LOCK_DISTANCE): 'x' | 'y' | null {
  'worklet';
  if (Math.max(Math.abs(dx), Math.abs(dy)) <= threshold) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
}

function clamp01(value: number): number {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

/** Drag-to-seek: the finger's x on the bar as a share of the track (0…1). */
export function scrubRatio(x: number, width: number): number {
  'worklet';
  return width > 0 ? clamp01(x / width) : 0;
}

/** Expand progress (0 = mini, 1 = full) from an upward drag `dy` (< 0). */
export function expandProgress(dy: number, screenHeight: number): number {
  'worklet';
  return clamp01(-dy / (screenHeight * VERTICAL_TRAVEL));
}

/** Expand progress while collapsing from full with a downward drag `dy` (> 0). */
export function collapseProgress(dy: number, screenHeight: number): number {
  'worklet';
  return clamp01(1 - dy / (screenHeight * VERTICAL_TRAVEL));
}

/** Release of a swipe-up from the mini-player. `velocityY` < 0 is upward. */
export function resolveExpand(progress: number, velocityY: number): 'open' | 'close' {
  'worklet';
  return progress > EXPAND_COMMIT || velocityY < -VERTICAL_FLICK_VELOCITY ? 'open' : 'close';
}

/** Release of a pull-down on the full player. `velocityY` > 0 is downward. */
export function resolveCollapse(progress: number, velocityY: number): 'open' | 'close' {
  'worklet';
  return progress < COLLAPSE_KEEP_OPEN || velocityY > VERTICAL_FLICK_VELOCITY ? 'close' : 'open';
}
