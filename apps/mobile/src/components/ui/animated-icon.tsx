import { useEffect, useRef } from 'react';
import type { ColorValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Icon } from './icon';

/**
 * Icon that gives a quick, subtle "pop" whenever its glyph changes — play ↔
 * pause, ♡ ↔ ♥, add ↔ check, download ↔ downloaded. One place gives every
 * button the same state-change feedback (used by IconButton, CircleButton and
 * PillButton). The first render and reduce-motion are static.
 */
export function AnimatedIcon({ name, size, color }: { name: string; size: number; color?: ColorValue }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const previous = useRef(name);

  useEffect(() => {
    if (previous.current === name) return;
    previous.current = name;
    if (reduceMotion) return;
    scale.value = withSequence(
      withTiming(0.72, { duration: 70, easing: Easing.out(Easing.quad) }),
      withTiming(1.12, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 110, easing: Easing.inOut(Easing.quad) }),
    );
  }, [name, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Icon name={name} size={size} color={color} />
    </Animated.View>
  );
}
