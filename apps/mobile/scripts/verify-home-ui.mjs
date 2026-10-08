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

// Living waveform: the whole wave bends, ripples and breathes; its tips stay put.
const clocks = [0, 0.13, 0.37, 0.5, 0.71, 0.93];
const sample = (fn) => clocks.flatMap((c) => Array.from({ length: WAVE_SLICES }, (_, i) => fn((i + 0.5) / WAVE_SLICES, c)));
check('envelope is still at both tips of the waveform', waveEnvelope(0) === 0 && waveEnvelope(1) === 0 && waveEnvelope(0.03) === 0 && waveEnvelope(0.97) === 0);
check('envelope moves the body of the wave', waveEnvelope(0.3) > 0.5 && waveEnvelope(0.7) > 0.5);
const idle = sample((t, c) => waveSliceMotion(t, c, c, c, 0));
const live = sample((t, c) => waveSliceMotion(t, c, c, c, 1));
const maxShift = (list) => Math.max(...list.map((m) => Math.abs(m.translateY)));
const maxStretch = (list) => Math.max(...list.map((m) => Math.abs(m.scaleY - 1)));
check(`calm idle motion (≤ 7 px, ≤ 12 % stretch): ${maxShift(idle).toFixed(1)} px`, maxShift(idle) <= 7 && maxStretch(idle) <= 0.12);
check('playing makes the motion fuller', maxShift(live) > maxShift(idle) && maxShift(live) <= 11);
check('it really moves (not a still image)', maxShift(idle) > 2 && maxStretch(idle) > 0.04);
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
