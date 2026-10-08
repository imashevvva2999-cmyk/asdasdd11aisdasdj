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

/**
 * One-at-a-time guard for an action that navigates (the stage cover opening the
 * player): a second tap while the first is still opening is ignored. Released
 * when the screen is back in focus; frees itself after `cooldownMs` so a missed
 * release can never leave the cover dead.
 */
export function createTapGuard(cooldownMs: number, now: () => number = Date.now) {
  let acquiredAt: number | undefined;
  return {
    tryAcquire(): boolean {
      const t = now();
      if (acquiredAt !== undefined && t - acquiredAt < cooldownMs) return false;
      acquiredAt = t;
      return true;
    },
    release(): void {
      acquiredAt = undefined;
    },
  };
}

/** How far the nav pill sinks while the Home stage grows into Now Playing:
 * only for that opening, and not at all under reduced motion (the player fades in). */
export function pillSinkOffset(progress: number, origin: 'mini' | 'stage', reduceMotion: boolean, distance: number): number {
  'worklet';
  return origin === 'stage' && !reduceMotion ? progress * distance : 0;
}

/** The ⌄ label on Lyrics / Queue: back to Now Playing when it is underneath,
 * otherwise (opened straight from Home) it simply closes. */
export function subHeaderBackLabel(previousRouteName: string | undefined): 'Back to player' | 'Close' {
  return previousRouteName === 'now-playing' ? 'Back to player' : 'Close';
}

/** The stage counts as gone (capsule appears) once this little of it is left on screen. */
const STAGE_EXIT_OFFSET = 80;

/** Whether enough of the Home stage is on screen to stand in for the capsule. */
export function stageOnScreen(scrollY: number, stageHeight: number): boolean {
  'worklet';
  // Before the stage is measured, assume it is there (it is, at the top).
  return stageHeight === 0 || scrollY < stageHeight - STAGE_EXIT_OFFSET;
}
