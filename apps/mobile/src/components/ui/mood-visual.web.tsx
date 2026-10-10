import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export type MoodVisualKind = 'moon' | 'rain' | 'energy' | 'flow';

const W = 64;
const H = 58;

let keyframesInjected = false;

/**
 * Web replacement for mood-visual.tsx: the Reanimated `withRepeat` loops used
 * there were confirmed (live DOM inspection, 2026-10-09) to render one frame
 * and then freeze on the web export — every element's inline transform/opacity
 * was byte-identical across a 4+ second poll. CSS @keyframes animate via the
 * browser's own compositor, independent of Reanimated's web driver, and
 * `@media (prefers-reduced-motion: reduce)` disables them natively.
 */
function ensureKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return;
  keyframesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes mmusic-moon-bob { 0%, 100% { transform: translateY(-1.5px); } 50% { transform: translateY(1.5px); } }
    @keyframes mmusic-twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.8; } }
    @keyframes mmusic-rain-fall { 0% { transform: translateY(-${H}px); } 100% { transform: translateY(0); } }
    @keyframes mmusic-energy-pulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.8; } }
    @keyframes mmusic-flow-glide { 0% { transform: translateX(0); } 100% { transform: translateX(-${W}px); } }
    .mmusic-moon-bob { animation: mmusic-moon-bob 5s ease-in-out infinite; }
    .mmusic-twinkle { animation: mmusic-twinkle 2.4s ease-in-out infinite; }
    .mmusic-rain-fall { animation: mmusic-rain-fall 2.6s linear infinite; }
    .mmusic-energy-pulse { animation: mmusic-energy-pulse 0.9s ease-in-out infinite; }
    .mmusic-flow-glide { animation: mmusic-flow-glide 4.8s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .mmusic-moon-bob, .mmusic-twinkle, .mmusic-rain-fall, .mmusic-energy-pulse, .mmusic-flow-glide { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
}

export function MoodVisual({ kind, color }: { kind: MoodVisualKind; color: string }) {
  useEffect(ensureKeyframes, []);
  return (
    <View pointerEvents="none" style={styles.box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {kind === 'moon' && <Moon color={color} />}
      {kind === 'rain' && <Rain color={color} />}
      {kind === 'energy' && <Energy color={color} />}
      {kind === 'flow' && <Flow color={color} />}
    </View>
  );
}

function Moon({ color }: { color: string }) {
  const id = useId();
  return (
    <>
      <div className="mmusic-moon-bob" style={{ position: 'absolute', inset: 0 }}>
        <Svg width={W} height={H}>
          <Circle cx={38} cy={30} r={14} fill={color} opacity={0.55} />
          <Circle cx={45} cy={24} r={13} fill={Colors.surface.l2} />
        </Svg>
      </div>
      <Star x={12} y={12} size={3} color={color} delay={0} id={`${id}-0`} />
      <Star x={20} y={40} size={2} color={color} delay={0.9} id={`${id}-1`} />
      <Star x={56} y={50} size={2} color={color} delay={1.7} id={`${id}-2`} />
    </>
  );
}

function Star({ x, y, size, color, delay, id }: { x: number; y: number; size: number; color: string; delay: number; id: string }) {
  return (
    <div
      key={id}
      className="mmusic-twinkle"
      style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color, animationDelay: `${delay}s` }}
    />
  );
}

const RAIN_STREAKS = [
  { x: 12, y: 6 },
  { x: 24, y: 30 },
  { x: 36, y: 12 },
  { x: 48, y: 40 },
  { x: 58, y: 20 },
  { x: 18, y: 48 },
];

function Rain({ color }: { color: string }) {
  return (
    <div className="mmusic-rain-fall" style={{ position: 'absolute', left: 0, top: 0, width: W, height: H * 2 }}>
      <Svg width={W} height={H * 2}>
        {[0, H].flatMap((offset) =>
          RAIN_STREAKS.map((streak, index) => (
            <Line key={`${offset}-${index}`} x1={streak.x} y1={streak.y + offset} x2={streak.x - 3} y2={streak.y + offset + 10} stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
          )),
        )}
      </Svg>
    </div>
  );
}

const ENERGY_STREAKS = [
  { left: 8, top: 26, delay: 0 },
  { left: 26, top: 13, delay: 0.26 },
  { left: 44, top: 0, delay: 0.52 },
];

function Energy({ color }: { color: string }) {
  return (
    <>
      {ENERGY_STREAKS.map((streak, index) => (
        <div key={index} className="mmusic-energy-pulse" style={{ position: 'absolute', left: streak.left, top: streak.top, animationDelay: `${streak.delay}s` }}>
          <Svg width={18} height={40}>
            <Polygon points="12,0 18,0 6,40 0,40" fill={color} />
          </Svg>
        </div>
      ))}
    </>
  );
}

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

function Flow({ color }: { color: string }) {
  return (
    <div className="mmusic-flow-glide" style={{ position: 'absolute', left: 0, top: 0, width: W * 2, height: H }}>
      <Svg width={W * 2} height={H}>
        {WAVES.map((wave, index) => (
          <Path key={index} d={wave.path} stroke={color} strokeWidth={1.6} fill="none" opacity={wave.opacity} strokeLinecap="round" />
        ))}
      </Svg>
    </div>
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
    opacity: 0.7,
  },
});
