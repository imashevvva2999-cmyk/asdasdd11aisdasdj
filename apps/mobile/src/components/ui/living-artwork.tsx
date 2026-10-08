import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';

const BREATH_MS = 4200;
const SWEEP_MS = 7000;
const GLOW_MS = 3200;

/**
 * Artwork that gently "breathes" — used for the Home hero waveform (Late Night
 * Flow). The original image stays as-is; the motion is layered on top with
 * transform/opacity only (cheap on native and web):
 * - a slow breath: the waveform swells ~3% horizontally and ~6% vertically;
 * - a soft band of warm light drifting left → right across the waveform;
 * - a restrained coral glow that pulses through the centre band.
 * With "reduce motion" enabled the image is shown completely still.
 */
export function LivingArtwork({ uri }: { uri: LocalOrRemoteImage }) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const breath = useSharedValue(0);
  const sweep = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const ease = Easing.inOut(Easing.sin);
    breath.value = withRepeat(withTiming(1, { duration: BREATH_MS, easing: ease }), -1, true);
    sweep.value = withRepeat(withSequence(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 0 })), -1);
    glow.value = withRepeat(withTiming(1, { duration: GLOW_MS, easing: ease }), -1, true);
  }, [reduceMotion, breath, sweep, glow]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + breath.value * 0.03 }, { scaleY: 1 + breath.value * 0.06 }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    // Travels from just off the left edge to just off the right edge.
    transform: [{ translateX: -width * 0.45 + sweep.value * width * 1.3 }],
    opacity: Math.sin(sweep.value * Math.PI) * 0.9,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + glow.value * 0.2,
    transform: [{ scaleY: 0.85 + glow.value * 0.2 }],
  }));

  return (
    // Clipped so the breathing scale never spills past the banner's image area.
    <View style={styles.root} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      <Animated.View style={[StyleSheet.absoluteFill, !reduceMotion && imageStyle]}>
        <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      {!reduceMotion && (
        <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
          <LinearGradient
            colors={['rgba(255, 107, 91, 0)', 'rgba(255, 107, 91, 0.55)', 'rgba(255, 107, 91, 0)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      {!reduceMotion && width > 0 && (
        <Animated.View pointerEvents="none" style={[styles.sweep, { width: width * 0.35 }, sweepStyle]}>
          <LinearGradient
            colors={['rgba(255, 190, 170, 0)', 'rgba(255, 190, 170, 0.16)', 'rgba(255, 190, 170, 0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
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
  glow: {
    position: 'absolute',
    top: '28%',
    bottom: '28%',
    left: 0,
    right: 0,
    // Brightens the waveform's own light instead of tinting the dark canvas.
    mixBlendMode: 'screen',
  },
  sweep: {
    position: 'absolute',
    top: '22%',
    bottom: '22%',
    left: 0,
    mixBlendMode: 'screen',
  },
});
