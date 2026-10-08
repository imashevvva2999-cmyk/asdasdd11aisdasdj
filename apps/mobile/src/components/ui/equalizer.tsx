import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

/** Per-bar timing so the bars move out of step, like a live meter. */
const BARS = [
  { delay: 0, up: 300, down: 360, rest: 0.45 },
  { delay: 140, up: 380, down: 300, rest: 0.75 },
  { delay: 70, up: 260, down: 340, rest: 0.55 },
];

/**
 * Animated 3-bar equalizer — the "now playing" indicator on track rows and the
 * mini-player (DESIGN.md "Track List Rows"). Screens render it only while the
 * player store says a track is playing, so it reflects playback state — it is
 * not driven by audio data. Bars grow from the baseline; reduce-motion shows a
 * still meter.
 */
export function EqualizerIndicator({ size = 16 }: { size?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <View style={[styles.row, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {BARS.map((bar, index) => (
        <Bar key={index} {...bar} still={reduceMotion} />
      ))}
    </View>
  );
}

function Bar({ delay, up, down, rest, still }: { delay: number; up: number; down: number; rest: number; still: boolean }) {
  const scale = useSharedValue(rest);

  useEffect(() => {
    if (still) return;
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: up, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: down, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, up, down, still, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bar: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.primary,
    // Grow from the baseline rather than the bar's centre.
    transformOrigin: 'bottom',
  },
});
