import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export type MoodVisualKind = 'moon' | 'rain' | 'energy' | 'flow';

/** Footprint in the card's lower-right corner, clear of the title/subtitle. */
const W = 64;
const H = 58;

/**
 * Small mood-specific motif for the Home "Mood & Vibe Mixes" cards, replacing
 * the old generic glow circle. Vector shapes only (crisp, lightweight); motion
 * is slow and transform/opacity-based, and stops under "reduce motion".
 * - moon: a crescent with faintly twinkling stars (Late Night)
 * - rain: slanted rain streaks drifting down (Melancholy)
 * - energy: angled light streaks pulsing in sequence (High Energy)
 * - flow: layered waves gliding sideways (Flow State)
 */
export function MoodVisual({ kind, color }: { kind: MoodVisualKind; color: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <View pointerEvents="none" style={styles.box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {kind === 'moon' && <Moon color={color} still={reduceMotion} />}
      {kind === 'rain' && <Rain color={color} still={reduceMotion} />}
      {kind === 'energy' && <Energy color={color} still={reduceMotion} />}
      {kind === 'flow' && <Flow color={color} still={reduceMotion} />}
    </View>
  );
}

/** 0→1→0 forever (or held at `rest` when still). */
function useOscillator(durationMs: number, still: boolean, delayMs = 0, rest = 1): SharedValue<number> {
  const value = useSharedValue(rest);
  useEffect(() => {
    if (still) return;
    value.value = 0;
    value.value = withDelay(delayMs, withRepeat(withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [durationMs, still, delayMs, value]);
  return value;
}

/** 0→1 then jump back, forever — for seamless scrolling patterns. */
function useLoop(durationMs: number, still: boolean): SharedValue<number> {
  const value = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    value.value = withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false);
  }, [durationMs, still, value]);
  return value;
}

function Moon({ color, still }: { color: string; still: boolean }) {
  const bob = useOscillator(5000, still, 0, 0.5);
  const moonStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (bob.value - 0.5) * 3 }] }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, moonStyle]}>
        <Svg width={W} height={H}>
          {/* Crescent: a lit disc with an offset card-coloured disc cut over it. */}
          <Circle cx={38} cy={30} r={14} fill={color} opacity={0.55} />
          <Circle cx={45} cy={24} r={13} fill={Colors.surface.l2} />
        </Svg>
      </Animated.View>
      <Star x={12} y={12} size={3} color={color} still={still} delay={0} />
      <Star x={20} y={40} size={2} color={color} still={still} delay={900} />
      <Star x={56} y={50} size={2} color={color} still={still} delay={1700} />
    </>
  );
}

function Star({ x, y, size, color, still, delay }: { x: number; y: number; size: number; color: string; still: boolean; delay: number }) {
  const twinkle = useOscillator(2400, still, delay, 0.6);
  const style = useAnimatedStyle(() => ({ opacity: 0.2 + twinkle.value * 0.6 }));
  return (
    <Animated.View
      style={[{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

/** Rain pattern repeats every H px vertically, so scrolling by H loops seamlessly. */
const RAIN_STREAKS = [
  { x: 12, y: 6 },
  { x: 24, y: 30 },
  { x: 36, y: 12 },
  { x: 48, y: 40 },
  { x: 58, y: 20 },
  { x: 18, y: 48 },
];

function Rain({ color, still }: { color: string; still: boolean }) {
  const fall = useLoop(2600, still);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -H + fall.value * H }] }));
  return (
    <Animated.View style={[styles.tall, style]}>
      <Svg width={W} height={H * 2}>
        {[0, H].flatMap((offset) =>
          RAIN_STREAKS.map((streak, index) => (
            <Line
              key={`${offset}-${index}`}
              x1={streak.x}
              y1={streak.y + offset}
              x2={streak.x - 3}
              y2={streak.y + offset + 10}
              stroke={color}
              strokeWidth={1.4}
              strokeLinecap="round"
              opacity={0.55}
            />
          )),
        )}
      </Svg>
    </Animated.View>
  );
}

const ENERGY_STREAKS = [
  { left: 8, top: 26, delay: 0 },
  { left: 26, top: 13, delay: 260 },
  { left: 44, top: 0, delay: 520 },
];

function Energy({ color, still }: { color: string; still: boolean }) {
  return (
    <>
      {ENERGY_STREAKS.map((streak, index) => (
        <EnergyStreak key={index} {...streak} color={color} still={still} />
      ))}
    </>
  );
}

function EnergyStreak({ left, top, delay, color, still }: { left: number; top: number; delay: number; color: string; still: boolean }) {
  const pulse = useOscillator(900, still, delay, 0.6);
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + pulse.value * 0.55 }));
  return (
    <Animated.View style={[{ position: 'absolute', left, top }, style]}>
      <Svg width={18} height={40}>
        {/* A slanted bolt-like sliver. */}
        <Polygon points="12,0 18,0 6,40 0,40" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** Sine path over two periods (2W wide) so shifting by W loops seamlessly. */
function wavePath(baseline: number, amplitude: number): string {
  const points: string[] = [];
  for (let x = 0; x <= W * 2; x += 4) {
    const y = baseline + Math.sin((x / W) * Math.PI * 2) * amplitude;
    points.push(`${x === 0 ? 'M' : 'L'}${x},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

const WAVES = [
  { path: wavePath(20, 4), opacity: 0.35 },
  { path: wavePath(32, 6), opacity: 0.6 },
  { path: wavePath(44, 4), opacity: 0.35 },
];

function Flow({ color, still }: { color: string; still: boolean }) {
  const glide = useLoop(4800, still);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -glide.value * W }] }));
  return (
    <Animated.View style={[styles.wide, style]}>
      <Svg width={W * 2} height={H}>
        {WAVES.map((wave, index) => (
          <Path key={index} d={wave.path} stroke={color} strokeWidth={1.6} fill="none" opacity={wave.opacity} strokeLinecap="round" />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: W,
    height: H,
    overflow: 'hidden',
    // Kept quiet so the white title/subtitle always reads first.
    opacity: 0.7,
  },
  tall: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: W,
    height: H * 2,
  },
  wide: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: W * 2,
    height: H,
  },
});
