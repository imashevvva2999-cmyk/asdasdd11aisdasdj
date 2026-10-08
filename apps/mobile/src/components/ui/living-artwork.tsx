import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';
import { WAVE_SLICES, waveSliceMotion } from '@/lib/wave-motion';

/** The three wave clocks: different, unrelated periods so the motion never visibly repeats. */
const CLOCK_MS = [7400, 11300, 13900] as const;

/**
 * Home hero artwork (Late Night Flow) as a living waveform. The artwork itself
 * moves: it is cut into thin vertical slices and each slice bends, ripples and
 * gently stretches along travelling waves (src/lib/wave-motion.ts), so the
 * whole coral wave flows while keeping its silhouette, colour and detail.
 * No overlays, no glow — the still artwork stays underneath only to fill the
 * dark edges a moved slice uncovers.
 *
 * Only transforms animate (on the UI thread, no re-renders), so it stays cheap
 * on phones and desktop. `active` (the hero playlist is playing — frontend
 * state only, not real audio data) makes the motion a little fuller.
 * Reduce motion shows the still image.
 */
export function LivingArtwork({ uri, active = false }: { uri: LocalOrRemoteImage; active?: boolean }) {
  const reduceMotion = useReducedMotion();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const energy = useSharedValue(active ? 1 : 0);
  const c1 = useSharedValue(0);
  const c2 = useSharedValue(0);
  const c3 = useSharedValue(0);
  const moving = !reduceMotion && size !== null;

  useEffect(() => {
    energy.value = withTiming(active ? 1 : 0, { duration: 900, easing: Easing.inOut(Easing.quad) });
  }, [active, energy]);

  useEffect(() => {
    if (!moving) return;
    // Each clock wraps 1 → 0; every motion term is periodic in it, so the loop has no seam.
    [c1, c2, c3].forEach((clock, i) => {
      clock.value = withRepeat(withTiming(1, { duration: CLOCK_MS[i], easing: Easing.linear }), -1, false);
    });
    return () => [c1, c2, c3].forEach((clock) => cancelAnimation(clock));
  }, [moving, c1, c2, c3]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== size?.width || height !== size?.height)) setSize({ width, height });
  };

  return (
    // Clipped so nothing spills past the banner's image area.
    <View style={styles.root} onLayout={onLayout}>
      <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />
      {moving &&
        Array.from({ length: WAVE_SLICES }, (_, index) => (
          <Slice key={index} index={index} uri={uri} size={size} clocks={[c1, c2, c3]} energy={energy} />
        ))}
    </View>
  );
}

function Slice({
  index,
  uri,
  size,
  clocks,
  energy,
}: {
  index: number;
  uri: LocalOrRemoteImage;
  size: { width: number; height: number };
  clocks: [SharedValue<number>, SharedValue<number>, SharedValue<number>];
  energy: SharedValue<number>;
}) {
  const sliceWidth = size.width / WAVE_SLICES;
  const t = (index + 0.5) / WAVE_SLICES;
  const [c1, c2, c3] = clocks;
  const motion = useAnimatedStyle(() => {
    const { translateY, scaleY } = waveSliceMotion(t, c1.value, c2.value, c3.value, energy.value);
    return { transform: [{ translateY }, { scaleY }] };
  });

  return (
    // A thin window onto the full artwork; the artwork inside it moves, the window doesn't.
    // 1 px of overlap hides hairline seams between neighbouring windows.
    <View pointerEvents="none" style={[styles.slice, { left: index * sliceWidth, width: sliceWidth + 1, height: size.height }]}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: -index * sliceWidth, width: size.width, height: size.height }, motion]}>
        <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  slice: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
});
