#!/usr/bin/env node
/**
 * Home UI helpers: the Late Night Flow living waveform (src/lib/wave-motion.ts)
 * and the For you ⋯ menu (src/lib/for-you-menu.ts). Real modules via `tsx`.
 *
 * Usage: npx tsx scripts/verify-home-ui.mjs
 */
import { WAVE_SLICES, waveEnvelope, waveSliceMotion } from '../src/lib/wave-motion.ts';
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

// Living waveform (v3, motion modelled on the "Моя волна" reference video; the
// artwork itself is unchanged): the wave morphs on continuous time — it never
// loops — with travelling swells, breathing and strands that spread and gather.
const ts = Array.from({ length: WAVE_SLICES }, (_, i) => (i + 0.5) / WAVE_SLICES);
const shape = (time, energy) => ts.map((t) => waveSliceMotion(t, time, energy));
const times = Array.from({ length: 240 }, (_, k) => k * 0.5); // two minutes, every half second
check('envelope is still at both tips of the waveform', waveEnvelope(0) === 0 && waveEnvelope(1) === 0 && waveEnvelope(0.03) === 0 && waveEnvelope(0.97) === 0);
check('envelope moves the body of the wave', waveEnvelope(0.3) > 0.5 && waveEnvelope(0.7) > 0.5);
const idle = times.flatMap((time) => shape(time, 0));
const live = times.flatMap((time) => shape(time, 1));
const maxShift = (list) => Math.max(...list.map((m) => Math.abs(m.translateY)));
const maxStretch = (list) => Math.max(...list.map((m) => Math.abs(m.scaleY - 1)));
// Same scale as the approved v2 (6.5 px / 13 %): the artwork stays recognisable.
check(
  `idle motion stays in the approved range (6–11 px bend, 12–22 % stretch): ${maxShift(idle).toFixed(1)} px, ${(maxStretch(idle) * 100).toFixed(0)} %`,
  maxShift(idle) >= 6 && maxShift(idle) <= 11 && maxStretch(idle) >= 0.12 && maxStretch(idle) <= 0.22,
);
check(`playing makes it fuller, never chaotic (≤ 15 px, ≤ 27 %): ${maxShift(live).toFixed(1)} px`, maxShift(live) > maxShift(idle) && maxShift(live) <= 15 && maxStretch(live) <= 0.27);

// No jumps: frame to frame (60 fps) over ten minutes, including where the swells re-enter.
let worstFrame = 0;
let worstFrameStretch = 0;
for (let time = 0; time < 600; time += 1 / 60) {
  for (const t of [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9]) {
    const a = waveSliceMotion(t, time, 0.5);
    const b = waveSliceMotion(t, time + 1 / 60, 0.5);
    worstFrame = Math.max(worstFrame, Math.abs(a.translateY - b.translateY));
    worstFrameStretch = Math.max(worstFrameStretch, Math.abs(a.scaleY - b.scaleY));
  }
}
check(`flows without jumps (worst frame step ${worstFrame.toFixed(2)} px ≤ 0.6, stretch ${(worstFrameStretch * 100).toFixed(2)} % ≤ 1)`, worstFrame <= 0.6 && worstFrameStretch <= 0.01);

// Never a visible loop: no shift of 1–120 s (incl. v2's 4.2 / 6.3 / 7.7 s clocks) brings the same shape back.
// Measured relative to the shape itself: a loop would come back ~0 % different.
const rms = (a, b) => Math.sqrt(a.reduce((s, m, i) => s + (m.translateY - (b ? b[i].translateY : 0)) ** 2, 0) / a.length);
const lags = [4.2, 6.3, 7.7, ...Array.from({ length: 120 }, (_, k) => k + 1)];
let closest = Infinity;
for (const start of [3, 17, 41]) {
  const base = shape(start, 0);
  for (const lag of lags) closest = Math.min(closest, rms(base, shape(start + lag, 0)) / rms(base));
}
check(`never repeats within two minutes (closest return differs by ${(closest * 100).toFixed(0)} % ≥ 15 %)`, closest >= 0.15);

// Organic, not a fixed wave sliding past: the wave's overall size breathes (stretch and contract).
const sizes = times.map((time) => Math.max(...shape(time, 0).map((m) => Math.abs(m.translateY))));
const breath = Math.max(...sizes) / Math.min(...sizes);
check(`the whole wave swells and settles (largest / smallest bend ${breath.toFixed(1)}× ≥ 1.6)`, breath >= 1.6);

// Layers: the upper and lower strands (the slice's stretch) move on their own wave, not in step with the bend.
const series = times.map((time) => waveSliceMotion(0.35, time, 0.5));
const corr = (xs, ys) => {
  const mx = xs.reduce((a, b) => a + b) / xs.length;
  const my = ys.reduce((a, b) => a + b) / ys.length;
  const cov = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  return cov / Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) * ys.reduce((a, y) => a + (y - my) ** 2, 0));
};
const r = corr(series.map((m) => m.translateY), series.map((m) => m.scaleY));
check(`upper and lower strands move independently of the bend (|r| = ${Math.abs(r).toFixed(2)} < 0.8)`, Math.abs(r) < 0.8);
check('strands both spread and gather', series.some((m) => m.scaleY > 1.05) && series.some((m) => m.scaleY < 0.95));
let worstStep = 0;
for (const time of times) {
  const s = shape(time, 1);
  for (let i = 1; i < WAVE_SLICES; i += 1) worstStep = Math.max(worstStep, Math.abs(s[i].translateY - s[i - 1].translateY));
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
