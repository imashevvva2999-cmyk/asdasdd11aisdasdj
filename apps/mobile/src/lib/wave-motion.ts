/**
 * Motion for the Late Night Flow living waveform (Home hero). The artwork is
 * cut into thin vertical slices; each slice is moved by these numbers, so the
 * whole picture of the wave bends, ripples and breathes while its silhouette,
 * colour and detail stay the artwork's own.
 *
 * Two waves travel along the waveform in opposite directions at different
 * rates (their interference keeps the shape from ever repeating in lockstep),
 * and a third layer, running against the bend, spreads and gathers the
 * strands so they cross and separate. Each clock runs
 * 0 → 1 and wraps, and every term is periodic in it, so the loop is seamless.
 * Pure worklet functions, covered by scripts/verify-home-ui.mjs.
 */

/** Vertical slices across the banner — enough that neighbours never show a step. */
export const WAVE_SLICES = 72;

/** The three wave clocks (ms per loop): unrelated periods so the motion never
 * visibly repeats; fast enough to read as flowing, none under 3 s. */
export const WAVE_CLOCK_MS = [4200, 6300, 7700] as const;

/** The waveform spans about 6–94 % of the banner; its tips taper to nothing. */
const WAVE_START = 0.05;
const WAVE_SPAN = 0.9;

/** How much a point along the banner (0–1) may move: 0 at the tips, full in
 * the two swelling lobes of the artwork's wave. */
export function waveEnvelope(t: number): number {
  'worklet';
  const u = (t - WAVE_START) / WAVE_SPAN;
  if (u <= 0 || u >= 1) return 0;
  return Math.pow(Math.sin(Math.PI * u), 1.1) * (0.75 + 0.25 * Math.abs(Math.sin(2 * Math.PI * u)));
}

/**
 * Offset (px) and vertical stretch of the slice at `t` for the three clocks.
 * `energy` 0 = calm idle, 1 = the hero playlist is playing (fuller motion).
 */
export function waveSliceMotion(t: number, c1: number, c2: number, c3: number, energy: number): { translateY: number; scaleY: number } {
  'worklet';
  const e = waveEnvelope(t);
  const reach = 8.5 + 3.5 * energy;
  const stretch = 0.15 + 0.06 * energy;
  // The bend: two waves travelling in opposite directions.
  const rightward = Math.sin(2 * Math.PI * (c1 - 0.9 * t));
  const leftward = Math.sin(2 * Math.PI * (c2 + 1.4 * t) + 1.3);
  // The strands' own layer: they spread and gather on a wave that runs against
  // the bend, so upper and lower strands cross and separate instead of moving as one.
  const spread = 0.7 * Math.sin(2 * Math.PI * (c3 - 0.75 * t) + 0.4) + 0.3 * Math.sin(2 * Math.PI * (c2 - 1.1 * t) + 2.1);
  return {
    translateY: reach * e * (0.62 * rightward + 0.38 * leftward),
    scaleY: 1 + stretch * e * spread,
  };
}
