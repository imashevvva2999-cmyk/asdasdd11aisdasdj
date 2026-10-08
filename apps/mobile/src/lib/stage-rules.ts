import type { PlaybackState } from '@/state/player-store';

/**
 * When the Floating Canvas shows a player at all (W3 Этап 1, decision OQ-W3-2).
 * The store seeds a queue on a cold load, so a "current track" exists before
 * anything was played; until playback has started once (`idle`) that is not an
 * active track — no Home stage and no capsule, never a fake playing state.
 */
export function hasStartedPlayback(playback: PlaybackState): boolean {
  return playback !== 'idle';
}

/** The stage counts as gone (capsule appears) once this little of it is left on screen. */
const STAGE_EXIT_OFFSET = 80;

/** Whether enough of the Home stage is on screen to stand in for the capsule. */
export function stageOnScreen(scrollY: number, stageHeight: number): boolean {
  'worklet';
  // Before the stage is measured, assume it is there (it is, at the top).
  return stageHeight === 0 || scrollY < stageHeight - STAGE_EXIT_OFFSET;
}
