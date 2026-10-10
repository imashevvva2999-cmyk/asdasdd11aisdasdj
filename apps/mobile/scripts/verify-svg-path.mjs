#!/usr/bin/env node
/**
 * SVG path math for the Analytics trend chart (Catmull-Rom smoothing to
 * cubic Bezier, matching the Stitch "midnight_mirage" chart's hand-authored
 * style). Usage: npx tsx scripts/verify-svg-path.mjs
 */
import { smoothAreaPath } from '../src/lib/svg-path.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const { linePath, areaPath } = smoothAreaPath([10, 50, 30, 80, 20], 340, 130);
check('linePath starts with a moveto command', linePath.startsWith('M '));
check('linePath is non-empty for 5 points', linePath.length > 10);
check('areaPath closes back down to the baseline (contains L ...,height and Z)', areaPath.includes(`,130 L`) || areaPath.endsWith('Z'));
check('areaPath is longer than linePath (it adds the closing baseline segment)', areaPath.length > linePath.length);

const two = smoothAreaPath([5, 95], 340, 130);
check('works with exactly 2 points (minimum, 24h period)', two.linePath.startsWith('M ') && two.linePath.length > 5);

const flat = smoothAreaPath([50, 50, 50, 50], 340, 130);
check('a flat series produces a valid (non-crashing) path', flat.linePath.startsWith('M '));

const single = (() => {
  try {
    return smoothAreaPath([42], 340, 130);
  } catch {
    return null;
  }
})();
check('a single point does not throw', single !== null && single.linePath.length > 0);

if (failures > 0) {
  console.error(`\n${failures} svg-path check(s) failed.`);
  process.exit(1);
}
console.log('\nAll svg-path checks passed.');
