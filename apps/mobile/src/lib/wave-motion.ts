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

const TAU = 2 * Math.PI;

/** A swell (Gaussian bump) gliding along the wave; it re-enters beyond the
 * still tips, so the wrap is never seen. */
function swell(t: number, time: number, speed: number, offset: number, width: number): number {
  'worklet';
  const phase = speed * time + offset;
  const center = -0.3 + 1.6 * (phase - Math.floor(phase));
  const d = (t - center) / width;
  return Math.exp(-d * d);
}

/**
 * Offset (px) and vertical stretch of the slice at `t` (0–1 across the banner)
 * at `time` (seconds, only ever increasing — so the motion never loops).
 * `energy` 0 = calm idle, 1 = the hero playlist is playing (fuller motion).
 *
 * Motion language from the "Моя волна" reference (the artwork is unchanged):
 * - two travelling waves at unrelated rates bend the body;
 * - swells glide along it, bulging up or down and receding, so the shape keeps
 *   reshaping instead of sliding past;
 * - the whole wave breathes (slowly grows and settles);
 * - the strands spread and gather on their own wave, against the bend.
 */
export function waveSliceMotion(t: number, time: number, energy: number): { translateY: number; scaleY: number } {
  'worklet';
  const e = waveEnvelope(t);
  const reach = 9 + 3.5 * energy;
  const stretch = 0.15 + 0.06 * energy;
  // Breathing: two slow, unrelated rhythms make the whole wave swell and settle
  // (never below ~60 %, so it never goes still).
  const breath = 0.86 + 0.16 * Math.sin(TAU * 0.071 * time + 0.6) * Math.cos(TAU * 0.0437 * time + 1.9) + 0.1 * Math.sin(TAU * 0.113 * time);
  // The bend: two waves travelling in opposite directions at unrelated rates.
  const rightward = Math.sin(TAU * (0.2381 * time - 0.9 * t));
  const leftward = Math.sin(TAU * (0.1587 * time + 1.4 * t) + 1.3);
  // Swells: each bulges up or down with its own slowly changing strength.
  const s1 = swell(t, time, 0.0831, 0.0, 0.13) * Math.sin(TAU * 0.0517 * time + 0.4);
  const s2 = swell(t, time, -0.0613, 0.47, 0.11) * Math.sin(TAU * 0.0389 * time + 2.2);
  const bend = 0.44 * rightward + 0.27 * leftward + 0.55 * (s1 + s2);
  // The strands' own layer: spreading where a swell passes, gathering after it.
  const spread =
    0.55 * Math.sin(TAU * (0.1299 * time - 0.75 * t) + 0.4) + 0.25 * Math.sin(TAU * (0.0917 * time - 1.1 * t) + 2.1) + 0.35 * (Math.abs(s1) - Math.abs(s2));
  return {
    translateY: reach * e * breath * bend,
    scaleY: 1 + stretch * e * (0.85 + 0.15 * breath) * spread,
  };
}
