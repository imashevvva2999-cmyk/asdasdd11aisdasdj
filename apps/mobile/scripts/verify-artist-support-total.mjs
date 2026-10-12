#!/usr/bin/env node
/**
 * Artist Dashboard Support stat card total (docs/superpowers/plans/
 * 2026-10-12-artist-dashboard-demo-seed.md, Task 1). Usage:
 * npx tsx scripts/verify-artist-support-total.mjs
 */
import { getArtistSupportTotalKgs } from '../src/lib/artist-support-total.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const entry = (artistId, amount) => ({
  id: `sup-${artistId}-${amount}`,
  artistId,
  amount,
  currency: 'KGS',
  status: 'completed',
  createdAt: '2026-10-12T00:00:00+06:00',
});

check(
  'sums only the entries matching the given artist id',
  getArtistSupportTotalKgs([entry('me', 100), entry('solaris-echo', 9999), entry('me', 50)], 'me') === 150,
);
check('returns 0 for an artist with no entries', getArtistSupportTotalKgs([entry('solaris-echo', 100)], 'me') === 0);
check('returns 0 for an empty history array', getArtistSupportTotalKgs([], 'me') === 0);

if (failures > 0) {
  console.error(`\n${failures} artist-support-total check(s) failed.`);
  process.exit(1);
}
console.log('\nAll artist-support-total checks passed.');
