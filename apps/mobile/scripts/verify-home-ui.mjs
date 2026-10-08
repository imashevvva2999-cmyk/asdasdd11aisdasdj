#!/usr/bin/env node
/**
 * Home UI helpers: the Late Night Flow living waveform (src/lib/wave-motion.ts)
 * and the For you ⋯ menu (src/lib/for-you-menu.ts). Real modules via `tsx`.
 *
 * Usage: npx tsx scripts/verify-home-ui.mjs
 */
import { WAVE_CLOCK_MS, WAVE_SLICES, waveEnvelope, waveSliceMotion } from '../src/lib/wave-motion.ts';
import { forYouMenuActions } from '../src/lib/for-you-menu.ts';
import { forYouTiles } from '../src/mocks/index.ts';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

// Living waveform: the whole wave bends, ripples and breathes; its tips stay put.
const clocks = [0, 0.13, 0.37, 0.5, 0.71, 0.93];
const sample = (fn) => clocks.flatMap((c) => Array.from({ length: WAVE_SLICES }, (_, i) => fn((i + 0.5) / WAVE_SLICES, c)));
check('envelope is still at both tips of the waveform', waveEnvelope(0) === 0 && waveEnvelope(1) === 0 && waveEnvelope(0.03) === 0 && waveEnvelope(0.97) === 0);
check('envelope moves the body of the wave', waveEnvelope(0.3) > 0.5 && waveEnvelope(0.7) > 0.5);
const idle = sample((t, c) => waveSliceMotion(t, c, c, c, 0));
const live = sample((t, c) => waveSliceMotion(t, c, c, c, 1));
const maxShift = (list) => Math.max(...list.map((m) => Math.abs(m.translateY)));
const maxStretch = (list) => Math.max(...list.map((m) => Math.abs(m.scaleY - 1)));
check(
  `lively idle motion (6–10 px bend, 12–20 % stretch): ${maxShift(idle).toFixed(1)} px, ${(maxStretch(idle) * 100).toFixed(0)} %`,
  maxShift(idle) >= 6 && maxShift(idle) <= 10 && maxStretch(idle) >= 0.12 && maxStretch(idle) <= 0.2,
);
check('playing makes it fuller, never chaotic (≤ 14 px, ≤ 25 %)', maxShift(live) > maxShift(idle) && maxShift(live) <= 14 && maxStretch(live) <= 0.25);
// v1 periods were 7.4 / 11.3 / 13.9 s and felt almost static: 1.5–2× faster, yet no clock under 3 s (calm, not frantic).
const V1_CLOCK_MS = [7400, 11300, 13900];
check(
  `flows 1.5–2× faster than v1 (${WAVE_CLOCK_MS.join(' / ')} ms)`,
  WAVE_CLOCK_MS.every((ms, i) => V1_CLOCK_MS[i] / ms >= 1.5 && V1_CLOCK_MS[i] / ms <= 2 && ms >= 3000),
);
// Layers: the upper and lower strands (the slice's stretch) move on their own wave, not in step with the bend.
const series = Array.from({ length: 400 }, (_, k) => {
  const c = k / 400;
  return waveSliceMotion(0.35, c, (c * 1.6) % 1, (c * 1.9) % 1, 0.5);
});
const corr = (xs, ys) => {
  const mx = xs.reduce((a, b) => a + b) / xs.length;
  const my = ys.reduce((a, b) => a + b) / ys.length;
  const cov = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  return cov / Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) * ys.reduce((a, y) => a + (y - my) ** 2, 0));
};
const r = corr(series.map((m) => m.translateY), series.map((m) => m.scaleY));
check(`upper and lower strands move independently of the bend (|r| = ${Math.abs(r).toFixed(2)} < 0.8)`, Math.abs(r) < 0.8);
check('strands both spread and gather', series.some((m) => m.scaleY > 1.05) && series.some((m) => m.scaleY < 0.95));
const loopStart = waveSliceMotion(0.4, 0, 0, 0, 0.5);
const loopEnd = waveSliceMotion(0.4, 1, 1, 1, 0.5);
check('loops seamlessly (clock 1 = clock 0)', Math.abs(loopStart.translateY - loopEnd.translateY) < 1e-9 && Math.abs(loopStart.scaleY - loopEnd.scaleY) < 1e-9);
let worstStep = 0;
for (const c of clocks) {
  for (let i = 1; i < WAVE_SLICES; i += 1) {
    const a = waveSliceMotion((i - 0.5) / WAVE_SLICES, c, c * 0.7, c * 1.3, 1);
    const b = waveSliceMotion((i + 0.5) / WAVE_SLICES, c, c * 0.7, c * 1.3, 1);
    worstStep = Math.max(worstStep, Math.abs(a.translateY - b.translateY));
  }
}
check(`neighbouring slices stay continuous (worst step ${worstStep.toFixed(2)} px ≤ 1.2)`, worstStep <= 1.2);

// For you ⋯ menu: only actions the app supports for a mix.
const mix = forYouTiles.find((t) => !t.artistId);
const artistTile = forYouTiles.find((t) => t.artistId);
check('a mix offers Play and Shuffle', JSON.stringify(forYouMenuActions(mix)) === JSON.stringify(['play', 'shuffle']));
check('the artist tile also offers View artist', JSON.stringify(forYouMenuActions(artistTile)) === JSON.stringify(['play', 'shuffle', 'view-artist']));
check('an empty mix offers nothing to play', forYouMenuActions({ id: 'x', title: 'x', trackIds: [] }).length === 0);

if (failures > 0) {
  console.error(`\n${failures} home-ui check(s) failed.`);
  process.exit(1);
}
console.log('\nAll home-ui checks passed.');
