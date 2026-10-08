import { useEffect } from 'react';
import { Easing, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

/** Matches the player store's 1s progress tick. */
const TICK_MS = 1000;
/** A forward step larger than this (as a fraction of the track) is a seek, not a tick. */
const MAX_TICK_STEP = 0.05;

/**
 * Turns the player's once-per-second progress ratio into a continuously
 * gliding value for progress bars (mini-player, Now Playing scrubber), so the
 * fill moves smoothly instead of jumping each second. It only interpolates
 * between real store values: seeks, track changes and pauses snap or hold
 * exactly where the store says. Reduce-motion snaps every update.
 */
export function useSmoothProgress(ratio: number): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(ratio);

  useEffect(() => {
    const step = ratio - progress.value;
    if (reduceMotion || step < 0 || step > MAX_TICK_STEP) {
      progress.value = ratio;
    } else {
      progress.value = withTiming(ratio, { duration: TICK_MS, easing: Easing.linear });
    }
  }, [ratio, reduceMotion, progress]);

  return progress;
}
