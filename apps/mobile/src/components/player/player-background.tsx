import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { carouselPos, paletteColor, useNeighborPalettes } from '@/state/player-surface';

/**
 * Adaptive full-player background (Dynamic Premium): the cover's palette
 * colour, blended between neighbouring tracks as the carousel moves (so it
 * follows the finger during a swipe), with a fixed darkening gradient towards
 * the bottom so the controls stay readable. No blur, no glow.
 */
export function PlayerBackground({ style }: { style?: ViewStyle }) {
  const { pos, prev, current, next } = useNeighborPalettes();
  const colorStyle = useAnimatedStyle(() => ({
    backgroundColor: paletteColor(carouselPos.value, pos, prev.background, current.background, next.background),
  }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, colorStyle]} />
      <LinearGradient
        colors={['rgba(10, 10, 12, 0)', 'rgba(10, 10, 12, 0.18)', 'rgba(10, 10, 12, 0.66)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
