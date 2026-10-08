import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { STAGE_SHADE, STAGE_VIGNETTE, stageTop } from '@/lib/stage-tones';
import { carouselPos, paletteColor, useNeighborPalettes } from '@/state/player-surface';

/**
 * Adaptive player background — the Floating Canvas "stage" (Dynamic Premium;
 * W3 spec §2.5): the cover's palette colour, blended between neighbouring
 * tracks as the carousel moves (so it follows the finger during a swipe),
 * shaded through four tones towards the bottom with a light edge vignette so
 * the controls stay readable. No blur, no glow.
 */
export function PlayerBackground({ style }: { style?: ViewStyle }) {
  const { pos, prev, current, next } = useNeighborPalettes();
  const tops = useMemo(() => ({ prev: stageTop(prev), current: stageTop(current), next: stageTop(next) }), [prev, current, next]);
  const colorStyle = useAnimatedStyle(() => ({
    backgroundColor: paletteColor(carouselPos.value, pos, tops.prev, tops.current, tops.next),
  }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, colorStyle]} />
      <LinearGradient colors={STAGE_SHADE.colors} locations={STAGE_SHADE.locations} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={STAGE_VIGNETTE.colors}
        locations={STAGE_VIGNETTE.locations}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
