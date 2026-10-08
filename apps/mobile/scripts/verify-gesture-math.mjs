#!/usr/bin/env node
/**
 * Tests for the player gesture decisions (src/lib/gesture-math.ts, Шаг 1 of
 * docs/superpowers/specs/2026-10-08-player-gestures-plan.md). The rules were
 * proven in the Step 0 spike (§12): a flick decides by the finger's direction,
 * a slow drag by distance; the axis locks on the first real movement.
 *
 * Usage: npx tsx scripts/verify-gesture-math.mjs
 */
import {
  collapseProgress,
  expandProgress,
  lockAxis,
  resolveCollapse,
  resolveExpand,
  resolveSwipe,
  rubberBand,
  scrubRatio,
} from '../src/lib/gesture-math.ts';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const W = 336;
// Horizontal carousel: offset < 0 = dragged left (towards next).
check('slow drag left past 35% → next', resolveSwipe(-0.4 * W, -100, W, true, true) === 'next');
check('slow drag right past 35% → prev', resolveSwipe(0.4 * W, 100, W, true, true) === 'prev');
check('slow short drag → cancel', resolveSwipe(-0.2 * W, -100, W, true, true) === 'cancel');
check('flick left (fast) → next even when short', resolveSwipe(-40, -900, W, true, true) === 'next');
check('flick left decides by direction even if the cover sits right of centre (mid-snap)', resolveSwipe(0.4 * W, -900, W, true, true) === 'next');
check('flick right → prev', resolveSwipe(40, 900, W, true, true) === 'prev');
check('no next track → cancel instead of next', resolveSwipe(-0.6 * W, -900, W, true, false) === 'cancel');
check('no previous track → cancel instead of prev', resolveSwipe(0.6 * W, 900, W, false, true) === 'cancel');

check('rubber band: no next track → resistance on a left drag', rubberBand(-100, true, false) === -30);
check('rubber band: no previous track → resistance on a right drag', rubberBand(100, false, true) === 30);
check('rubber band: free when a neighbour exists', rubberBand(-100, true, true) === -100);

check('axis: not locked below the threshold', lockAxis(3, 4) === null);
check('axis: mostly horizontal → x', lockAxis(20, -8) === 'x');
check('axis: mostly vertical → y', lockAxis(5, -20) === 'y');
check('axis: diagonal leaning horizontal → x', lockAxis(-150, -36) === 'x');

const H = 844;
// 1:1 with the finger: the sheet edge stays under it (progress = share of the screen height).
check('expand progress follows an upward drag 1:1', Math.abs(expandProgress(-0.5 * H, H) - 0.5) < 1e-9);
check('expand progress is clamped 0…1', expandProgress(200, H) === 0 && expandProgress(-2 * H, H) === 1);
check('collapse progress follows a downward drag 1:1', Math.abs(collapseProgress(0.5 * H, H) - 0.5) < 1e-9);
check('collapse progress is clamped 0…1', collapseProgress(-100, H) === 1 && collapseProgress(2 * H, H) === 0);

check('expand: released past 30% → open', resolveExpand(0.35, 0) === 'open');
check('expand: short but fast upward flick → open', resolveExpand(0.15, -900) === 'open');
check('expand: short and slow → close (cancel)', resolveExpand(0.15, -100) === 'close');
check('collapse: pulled below 75% → close', resolveCollapse(0.7, 0) === 'close');
check('collapse: short but fast downward flick → close', resolveCollapse(0.9, 900) === 'close');
check('collapse: short and slow → stays open', resolveCollapse(0.9, 100) === 'open');

// Drag-to-seek: finger x on the bar → share of the track, clamped.
check('scrub: middle of the bar → 0.5', scrubRatio(150, 300) === 0.5);
check('scrub: finger past either end is clamped 0…1', scrubRatio(-40, 300) === 0 && scrubRatio(360, 300) === 1);
check('scrub: unknown bar width → 0 (no NaN seek)', scrubRatio(100, 0) === 0);

if (failures > 0) {
  console.error(`\n${failures} gesture-math check(s) failed.`);
  process.exit(1);
}
console.log('\nAll gesture-math checks passed.');
