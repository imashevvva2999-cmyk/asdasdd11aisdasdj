import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui';

import { S, alpha } from './theme';

const SIZE = 76;

/**
 * Campaign success mark: a softly glowing gradient check that settles in, plus
 * one radial light wave expanding outward — about 1.2 s in total, then static.
 * Reduced motion: the final static state renders immediately.
 */
export function SuccessCheck() {
  const reduceMotion = useReducedMotion();
  const check = useSharedValue(reduceMotion ? 1 : 0);
  const wave = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    check.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.back(1.4)) });
    wave.value = withDelay(220, withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) }));
  }, [reduceMotion, check, wave]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, check.value * 1.6),
    transform: [{ scale: 0.72 + 0.28 * check.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.55 * check.value }));
  const waveStyle = useAnimatedStyle(() => ({
    opacity: wave.value >= 1 ? 0 : 0.45 * (1 - wave.value),
    transform: [{ scale: 1 + 1.25 * wave.value }],
  }));

  return (
    <View style={styles.box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.wave, waveStyle]} pointerEvents="none" />
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
      <Animated.View style={checkStyle}>
        <LinearGradient colors={[S.primaryContainer, S.tertiaryContainer, S.secondary]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.check}>
          <Icon name="check" size={36} color={S.onPrimaryContainer} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  check: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: alpha(S.primaryContainer, 0.35),
    shadowColor: S.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 26,
    shadowOpacity: 0.9,
  },
  wave: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    borderColor: alpha(S.primary, 0.9),
  },
});
