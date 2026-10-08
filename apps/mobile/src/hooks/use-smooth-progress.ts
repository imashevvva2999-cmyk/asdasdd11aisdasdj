import { useEffect } from 'react';
import { Easing, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { STATUS_INTERVAL_MS } from '@/audio/audio-engine';
/** A forward step larger than this (as a fraction of the track) is a seek, not an update. */
const MAX_TICK_STEP = 0.05;

/**
 * Turns the audio engine's periodic position updates (every
 * STATUS_INTERVAL_MS) into a continuously gliding value for progress bars
 * (mini-player, Now Playing scrubber, Lyrics), so the fill moves smoothly
 * instead of stepping. It only interpolates between real engine positions:
 * seeks, track changes and pauses snap or hold exactly where the store says.
 * Reduce-motion snaps every update.
 */
export function useSmoothProgress(ratio: number): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(ratio);

  useEffect(() => {
    const step = ratio - progress.value;
    if (reduceMotion || step < 0 || step > MAX_TICK_STEP) {
      progress.value = ratio;
    } else {
      progress.value = withTiming(ratio, { duration: STATUS_INTERVAL_MS, easing: Easing.linear });
    }
  }, [ratio, reduceMotion, progress]);

  return progress;
}
