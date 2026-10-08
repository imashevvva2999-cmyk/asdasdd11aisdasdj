import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { type LocalOrRemoteImage, toImageSource } from '@/constants/stitch-artwork';

/** SVG canvas; stretched over the image area (preserveAspectRatio="none"). */
const VB_W = 200;
const VB_H = 100;
/** Horizontal span of the waveform in the Late Night Flow artwork. */
const X_START = 22;
const X_END = 178;
const GLOW_MS = 3200;

/**
 * One strand: a sum of sines under a two-lobed envelope (the artwork's own
 * waveform swells twice), so every strand tapers to nothing at both ends.
 */
function strandPath(cycles: number, phase: number, amplitude: number): string {
  const points: string[] = [];
  for (let x = X_START; x <= X_END; x += 2) {
    const t = (x - X_START) / (X_END - X_START);
    const envelope = Math.pow(Math.sin(Math.PI * t), 1.4) * (0.7 + 0.3 * Math.abs(Math.sin(Math.PI * 2 * t + 0.4)));
    const carrier = Math.sin(t * cycles * Math.PI * 2 + phase) + 0.35 * Math.sin(t * cycles * 2.3 * Math.PI * 2 + phase * 1.7);
    const y = VB_H / 2 + carrier * envelope * amplitude;
    points.push(`${x === X_START ? 'M' : 'L'}${x},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

/** Each strand swings through its own standing wave at its own rate, so the
 * strands keep crossing and re-forming instead of moving in lockstep. */
const STRANDS = [
  { d: strandPath(2.5, 0, 22), periodMs: 3100, drift: 3, color: '#FF8A73', width: 1.4, opacity: 0.75 },
  { d: strandPath(3.2, 1.3, 18), periodMs: 4300, drift: -4, color: '#FFB199', width: 1, opacity: 0.6 },
  { d: strandPath(1.8, 2.4, 26), periodMs: 5600, drift: 2, color: '#FF6B5B', width: 1.2, opacity: 0.55 },
  { d: strandPath(4.1, 0.7, 12), periodMs: 2500, drift: -2, color: '#FFD2C4', width: 0.8, opacity: 0.5 },
];

/**
 * Home hero artwork (Late Night Flow) as a living waveform. The original image
 * stays still underneath; on top, thin vector light strands undulate through
 * standing waves at different rates with a soft coral glow, blended with
 * "screen" so they read as part of the artwork's own light.
 *
 * `active` (the hero playlist is the one currently playing) makes the motion
 * fuller and the glow warmer. It reflects the frontend playback state only —
 * this is not driven by real audio data. Reduce motion shows the still image.
 */
export function LivingArtwork({ uri, active = false }: { uri: LocalOrRemoteImage; active?: boolean }) {
  const reduceMotion = useReducedMotion();
  const energy = useSharedValue(active ? 1 : 0);
  const glow = useSharedValue(0);

  useEffect(() => {
    energy.value = withTiming(active ? 1 : 0, { duration: 700, easing: Easing.inOut(Easing.quad) });
  }, [active, energy]);

  useEffect(() => {
    if (reduceMotion) return;
    glow.value = withRepeat(withTiming(1, { duration: GLOW_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduceMotion, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.08 + glow.value * (0.14 + energy.value * 0.12),
    transform: [{ scaleY: 0.8 + glow.value * 0.25 }],
  }));

  return (
    // Clipped so nothing spills past the banner's image area.
    <View style={styles.root}>
      <Image source={toImageSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" />
      {!reduceMotion && (
        <>
          <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
            <LinearGradient
              colors={['rgba(255, 107, 91, 0)', 'rgba(255, 107, 91, 0.55)', 'rgba(255, 107, 91, 0)']}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          {STRANDS.map((strand, index) => (
            <Strand key={index} {...strand} energy={energy} />
          ))}
        </>
      )}
    </View>
  );
}

function Strand({
  d,
  periodMs,
  drift,
  color,
  width,
  opacity,
  energy,
}: (typeof STRANDS)[number] & { energy: SharedValue<number> }) {
  const cycle = useSharedValue(0);

  useEffect(() => {
    cycle.value = withRepeat(withTiming(1, { duration: periodMs, easing: Easing.linear }), -1, false);
  }, [periodMs, cycle]);

  const style = useAnimatedStyle(() => {
    const angle = cycle.value * Math.PI * 2;
    // Idle: a calm, low swing. Active: the full swing.
    const reach = 0.45 + energy.value * 0.55;
    return {
      transform: [{ translateX: Math.sin(angle) * drift }, { scaleY: Math.sin(angle) * reach }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.layer, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        <Path d={d} stroke={color} strokeWidth={width} strokeOpacity={opacity} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </Svg>
    </Animated.View>
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
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Adds light to the artwork instead of painting over it.
    mixBlendMode: 'screen',
  },
  glow: {
    position: 'absolute',
    top: '28%',
    bottom: '28%',
    left: 0,
    right: 0,
    mixBlendMode: 'screen',
  },
});
