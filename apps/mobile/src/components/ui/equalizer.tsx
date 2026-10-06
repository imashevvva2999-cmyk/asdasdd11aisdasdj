import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

const BAR_COUNT = 3;

/** Animated 3-bar equalizer — active-track indicator (DESIGN.md "Track List Rows"). */
export function EqualizerIndicator({ size = 16 }: { size?: number }) {
  return (
    <View style={[styles.row, { width: size, height: size }]}>
      {Array.from({ length: BAR_COUNT }).map((_, index) => (
        <Bar key={index} delay={index * 120} />
      ))}
    </View>
  );
}

function Bar({ delay }: { delay: number }) {
  const scale = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 320, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, scale]);

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
  },
});
