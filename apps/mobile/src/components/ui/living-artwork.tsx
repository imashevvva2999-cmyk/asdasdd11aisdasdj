import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { toImageSource } from '@/constants/artwork-sources';
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';
import { WAVE_SLICES, waveSliceMotion } from '@/lib/wave-motion';

/** The motion grows in from the still artwork instead of snapping to a bent pose. */
const INTRO_S = 0.8;

/**
 * Home hero artwork (Late Night Flow) as a living waveform. The artwork itself
 * moves: it is cut into thin vertical slices and each slice bends, ripples and
 * gently stretches (src/lib/wave-motion.ts), so the whole coral wave morphs
 * while keeping its silhouette, colour and detail. No overlays, no glow — the
 * still artwork stays underneath only to fill the dark edges a moved slice uncovers.
 *
 * Driven by one continuous clock (seconds, only increasing), so the motion
 * never loops. Only transforms animate (on the UI thread, no re-renders), so it
 * stays cheap on phones and desktop. `active` (the hero playlist is playing —
 * frontend state only, not real audio data) makes the motion a little fuller.
 * Reduce motion shows the still image.
 */
export function LivingArtwork({ uri, active = false }: { uri: LocalOrRemoteImage; active?: boolean }) {
  const reduceMotion = useReducedMotion();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const energy = useSharedValue(active ? 1 : 0);
  const time = useSharedValue(0);
  const moving = !reduceMotion && size !== null;

  useEffect(() => {
    energy.value = withTiming(active ? 1 : 0, { duration: 900, easing: Easing.inOut(Easing.quad) });
  }, [active, energy]);

  const clock = useFrameCallback((frame) => {
    // Capped so a stalled frame (tab switch, slow device) never jumps the shape.
    time.value += Math.min(frame.timeSincePreviousFrame ?? 0, 50) / 1000;
  }, false);

  useEffect(() => {
    clock.setActive(moving);
    return () => clock.setActive(false);
  }, [moving, clock]);

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
          <Slice key={index} index={index} uri={uri} size={size} time={time} energy={energy} />
        ))}
    </View>
  );
}

function Slice({
  index,
  uri,
  size,
  time,
  energy,
}: {
  index: number;
  uri: LocalOrRemoteImage;
  size: { width: number; height: number };
  time: SharedValue<number>;
  energy: SharedValue<number>;
}) {
  const sliceWidth = size.width / WAVE_SLICES;
  const t = (index + 0.5) / WAVE_SLICES;
  const motion = useAnimatedStyle(() => {
    const { translateY, scaleY } = waveSliceMotion(t, time.value, energy.value);
    const p = Math.min(time.value / INTRO_S, 1);
    const intro = p * p * (3 - 2 * p);
    return { transform: [{ translateY: translateY * intro }, { scaleY: 1 + (scaleY - 1) * intro }] };
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
