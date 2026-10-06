import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { pressState } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = PressableProps & {
  /** Scale target while pressed. Defaults to the DESIGN.md press-state token (0.96). */
  scaleTo?: number;
};

/**
 * Shared press-feedback wrapper (scale 0.96, 150ms — DESIGN.md "Buttons & Interactive
 * Controls"). Used by Button/Chip/IconButton/cards instead of each re-implementing
 * the same animation.
 */
export function PressableScale({ scaleTo = pressState.scale, style, disabled, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: pressState.durationMs });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: pressState.durationMs });
        onPressOut?.(e);
      }}
      style={[animatedStyle, typeof style === 'function' ? undefined : style]}
      {...rest}
    />
  );
}
