import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

import { ThemedText } from './themed-text';

/**
 * Resting height (fraction of the icon height) and loop timing per bar. The
 * resting shape mirrors the static `graphic-eq` glyph the headers used before
 * (short – tall – tallest – tall – short); different durations and offsets keep
 * the bars out of step, so it reads as live audio rather than one bounce.
 */
const BARS = [
  { rest: 0.45, duration: 1100, delay: 0 },
  { rest: 0.75, duration: 900, delay: 180 },
  { rest: 1, duration: 1300, delay: 90 },
  { rest: 0.7, duration: 1000, delay: 320 },
  { rest: 0.4, duration: 1200, delay: 140 },
] as const;

/** How far a bar dips at the bottom of its breath (fraction of its own height). */
const MIN_SCALE = 0.45;

/**
 * Shared Mmusic brand mark — the wordmark followed by a gently animated coral
 * sound-wave. Used wherever the brand wordmark appears (Home and Search
 * headers). The icon sits in a fixed-size box and bars scale from their own
 * centre, so the animation never moves or resizes the surrounding header.
 */
export function MmusicBrand({ iconSize = 16 }: { iconSize?: number }) {
  const barWidth = Math.max(2, Math.round(iconSize / 7));
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Mmusic">
      <ThemedText variant="headline-md">Mmusic</ThemedText>
      <View style={[styles.icon, { width: iconSize, height: iconSize }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {BARS.map((bar, index) => (
          <WaveBar key={index} height={iconSize * bar.rest} width={barWidth} duration={bar.duration} delay={bar.delay} />
        ))}
      </View>
    </View>
  );
}

function WaveBar({ height, width, duration, delay }: { height: number; width: number; duration: number; delay: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    // Ease down and back up forever; `reverse` keeps the loop seamless.
    scale.value = withDelay(delay, withRepeat(withTiming(MIN_SCALE, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [delay, duration, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  return <Animated.View style={[styles.bar, { height, width, borderRadius: width / 2 }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bar: {
    backgroundColor: Colors.primary,
  },
});
