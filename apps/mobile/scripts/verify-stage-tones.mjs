#!/usr/bin/env node
/**
 * Tests for the Floating Canvas stage tones (src/lib/stage-tones.ts, W3 Этап 1,
 * docs/superpowers/specs/2026-10-08-w3-floating-canvas-implementation.md §2.5):
 * the stage's top tone is the cover colour pulled 30 % towards the canvas, so
 * white text only gains contrast. Real modules via `tsx`, plain asserts.
 *
 * Usage: npx tsx scripts/verify-stage-tones.mjs
 */
import { palettesByArtworkPath } from '../src/constants/artwork-palettes.ts';
import { contrastRatio } from '../src/lib/palette.ts';
import { STAGE_SHADE, STAGE_VIGNETTE, mixHex, stageTop } from '../src/lib/stage-tones.ts';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('mix 0 → first colour', mixHex('#365ba0', '#0a0a0c', 0) === '#365ba0');
check('mix 1 → second colour', mixHex('#365ba0', '#0a0a0c', 1) === '#0a0a0c');
check('mix 0.3 rounds per channel', mixHex('#365ba0', '#0a0a0c', 0.3) === '#294374');
check('mix clamps t outside 0…1', mixHex('#000000', '#ffffff', 2) === '#ffffff' && mixHex('#000000', '#ffffff', -1) === '#000000');
check(
  'stage top = background 70 % + canvas 30 %',
  stageTop({ background: '#365ba0', deep: '#1b2946', mini: '#000000', accent: '#ffffff' }) === '#294374',
);
check('shade stops are ordered 0…1', STAGE_SHADE.locations.every((l, i, a) => l >= 0 && l <= 1 && (i === 0 || l > a[i - 1])));
check(
  'shade and vignette have one colour per stop',
  STAGE_SHADE.colors.length === STAGE_SHADE.locations.length && STAGE_VIGNETTE.colors.length === STAGE_VIGNETTE.locations.length,
);
const palettes = Object.values(palettesByArtworkPath);
const weakest = palettes.map((p) => contrastRatio('#ffffff', stageTop(p))).reduce((a, b) => Math.min(a, b), Infinity);
check(`white on every stage top ≥ 5:1 (${palettes.length} palettes, weakest ${weakest.toFixed(2)})`, palettes.length > 0 && weakest >= 5);

if (failures > 0) {
  console.error(`\n${failures} stage-tone check(s) failed.`);
  process.exit(1);
}
console.log('\nAll stage-tone checks passed.');
