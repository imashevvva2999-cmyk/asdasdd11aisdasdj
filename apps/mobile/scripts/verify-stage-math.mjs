#!/usr/bin/env node
/**
 * Tests for the Home stage → Now Playing transition geometry
 * (src/lib/stage-math.ts, W3 Этап 1; storyboard
 * docs/superpowers/specs/w3-concepts/iphone/transition-storyboard.png): the
 * cover moves between its two places, Home's chrome leaves before the
 * player's arrives, so no frame shows both. Real modules via `tsx`.
 *
 * Usage: npx tsx scripts/verify-stage-math.mjs
 */
import {
  ARTWORK_MIN_SIZE,
  clamp01,
  fitArtworkSize,
  homeChromeOffset,
  homeChromeOpacity,
  lerpRect,
  playerChromeOffset,
  playerChromeOpacity,
} from '../src/lib/stage-math.ts';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const near = (a, b) => Math.abs(a - b) < 1e-6;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const home = { x: 67, y: 120, width: 256, height: 256 };
const player = { x: 35, y: 112, width: 320, height: 320 };

check('clamp01 keeps 0…1', clamp01(-0.5) === 0 && clamp01(0.4) === 0.4 && clamp01(3) === 1);
check('cover at p=0 is the stage cover', same(lerpRect(home, player, 0), home));
check('cover at p=1 is the player cover', same(lerpRect(home, player, 1), player));
check('cover halfway is the midpoint', near(lerpRect(home, player, 0.5).width, 288) && near(lerpRect(home, player, 0.5).x, 51));
check('cover progress is clamped (spring overshoot)', same(lerpRect(home, player, 1.2), player));
check('home chrome visible at rest', homeChromeOpacity(0) === 1 && homeChromeOffset(0) === 0);
check('home chrome gone by p=0.32', homeChromeOpacity(0.32) === 0);
check('home chrome slides 90 down when open', homeChromeOffset(1) === 90);
check('player chrome hidden until p=0.54', playerChromeOpacity(0.54) === 0);
check('player chrome fully in by p=0.96', playerChromeOpacity(0.96) === 1);
check('player chrome rises from 40 below', playerChromeOffset(0) === 40 && playerChromeOffset(1) === 0);
check(
  'no frame shows both chromes',
  [0.1, 0.2, 0.3, 0.4, 0.5].every((p) => homeChromeOpacity(p) === 0 || playerChromeOpacity(p) === 0),
);

// Now Playing cover: width-bound on tall phones, height-bound on short ones,
// so the bottom action row never leaves the screen (360 × 740 clipped it).
check('iPhone 390 × 844: width-bound cover, capped at 340', fitArtworkSize(390, 844) === 340);
check('360 × 740: the cover shrinks so the controls fit', fitArtworkSize(360, 740) < 320 && fitArtworkSize(360, 740) === 740 - 470);
check('very short window: never below the minimum', fitArtworkSize(375, 560) === ARTWORK_MIN_SIZE);
check('unknown height (server render, 0): width-bound', fitArtworkSize(390, 0) === 340);

if (failures > 0) {
  console.error(`\n${failures} stage-math check(s) failed.`);
  process.exit(1);
}
console.log('\nAll stage-math checks passed.');
