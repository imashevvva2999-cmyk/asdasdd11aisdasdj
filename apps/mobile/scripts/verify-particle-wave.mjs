#!/usr/bin/env node
/**
 * Late Night Flow particle wave (src/components/ui/particle-wave/engine.ts):
 * the approved Particle Wave B configuration, deterministic particles and the
 * adaptive-quality steps. The WebGL drawing itself is checked in the browser.
 * Usage: npx tsx scripts/verify-particle-wave.mjs
 */
import {
  APPROVED_DENSITY,
  APPROVED_SPEED,
  BASE_STRAND_PARTICLES,
  DEFAULT_TINT,
  GHOSTS,
  INITIAL_QUALITY,
  buildParticles,
  nextQuality,
} from '../src/components/ui/particle-wave/engine.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

// The approved configuration from the 8099 preview.
check('approved speed is exactly 1.90×', APPROVED_SPEED === 1.9);
check('approved density is the preview default (1×)', APPROVED_DENSITY === 1);
const approved = buildParticles(APPROVED_DENSITY);
check(`approved particle count 11,660 (${approved.count / GHOSTS})`, approved.count / GHOSTS === 11660 && BASE_STRAND_PARTICLES === 11000);
check('three trail ghosts per particle', GHOSTS === 3 && approved.count % 3 === 0);

// Deterministic: the same particles on every load and device.
const again = buildParticles(APPROVED_DENSITY);
check('particles are identical between builds', approved.data.length === again.data.length && approved.data.every((v, i) => v === again.data[i]));
check('no NaN or infinite attributes', approved.data.every((v) => Number.isFinite(v)));
const kinds = new Set();
for (let i = 13; i < approved.data.length; i += 14) kinds.add(approved.data[i]);
check('strand, shard, haze and dust particles are all present', [0, 1, 2, 3].every((k) => kinds.has(k)));
const strandPhases = new Set();
for (let i = 4; i < approved.data.length; i += 14) if (approved.data[i + 9] === 0) strandPhases.add(approved.data[i]);
check(`particles form 24 ribbons (${strandPhases.size})`, strandPhases.size === 24);

// Adaptive quality: sharpness first, then density; never below the floor; recovers nothing mid-session.
let q = INITIAL_QUALITY;
check('starts at the approved quality (2× pixels, 1× density)', q.dprCap === 2 && q.density === 1);
const run = (frames, ms) => {
  for (let i = 0; i < frames; i += 1) q = nextQuality(q, ms);
};
run(600, 16.7);
check('smooth frames keep full quality', q.dprCap === 2 && q.density === 1);
run(60, 30);
check('sustained slow frames lower the pixel ratio first (2 → 1.5)', q.dprCap === 1.5 && q.density === 1);
run(60, 30);
check('then to 1×', q.dprCap === 1 && q.density === 1);
run(60, 30);
check('then the particle density (1 → 0.75)', q.dprCap === 1 && q.density === 0.75);
run(600, 30);
check('density never drops below 0.55', q.density === 0.55);
q = INITIAL_QUALITY;
run(30, 30);
run(30, 16.7);
run(30, 30);
check('an occasional slow frame does not degrade quality', q.dprCap === 2 && q.density === 1);

check('DEFAULT_TINT is a valid 0..1 RGB triple close to the approved peach', (() => {
  const [r, g, b] = DEFAULT_TINT;
  return r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1 && r > g && g > b;
})());

if (failures > 0) {
  console.error(`\n${failures} particle-wave check(s) failed.`);
  process.exit(1);
}
console.log('\nAll particle-wave checks passed.');
