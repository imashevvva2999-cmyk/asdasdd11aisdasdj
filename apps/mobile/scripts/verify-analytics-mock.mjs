#!/usr/bin/env node
/**
 * Mock analytics data: deterministic per track+period, internally consistent
 * (percentages sum to 100, peak matches the trend's real max).
 * Usage: npx tsx scripts/verify-analytics-mock.mjs
 */
import { getArtistDemoTotals, getTrackAnalytics } from '../src/lib/analytics-mock.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const a = getTrackAnalytics('midnight-mirage', '28d');
const b = getTrackAnalytics('midnight-mirage', '28d');
check('same track+period is deterministic (same numbers every call)', JSON.stringify(a) === JSON.stringify(b));

const c = getTrackAnalytics('midnight-mirage', '7d');
check('a different period gives a different trend', JSON.stringify(a.trend) !== JSON.stringify(c.trend));

const d = getTrackAnalytics('horizon', '28d');
check('a different track gives different numbers for the same period', a.streams !== d.streams);

check('streams/listeners/playlistAdds are positive integers', Number.isInteger(a.streams) && a.streams > 0 && Number.isInteger(a.listeners) && a.listeners > 0 && Number.isInteger(a.playlistAdds) && a.playlistAdds > 0);
check('completionPct is between 0 and 100', a.completionPct > 0 && a.completionPct <= 100);
check('geography percentages sum to 100', Math.round(a.geography.reduce((sum, g) => sum + g.pct, 0)) === 100);
check('channel percentages sum to 100', Math.round(a.channels.reduce((sum, c2) => sum + c2.pct, 0)) === 100);
check('device percentages sum to 100', Math.round(a.devices.reduce((sum, dev) => sum + dev.pct, 0)) === 100);
check('peak equals the real maximum of the trend values', a.peak === Math.max(...a.trend.map((p) => p.value)));
check('trend has at least 2 points for every period', ['24h', '7d', '28d', 'all'].every((p) => getTrackAnalytics('midnight-mirage', p).trend.length >= 2));
check('avgListenSec is positive and avgListenPct is 0-100', a.avgListenSec > 0 && a.avgListenPct > 0 && a.avgListenPct <= 100);

// Overview/Analytics consistency: artist-level demo totals are derived from
// the same per-track figures the Analytics tab shows.
const ids = ['midnight-mirage', 'horizon'];
const totals = getArtistDemoTotals(ids);
check(
  'demo total streams = sum of each track\'s "All time" streams',
  totals.streams === ids.reduce((sum, id) => sum + getTrackAnalytics(id, 'all').streams, 0),
);
check(
  'demo monthly listeners = sum of each track\'s 28-day listeners',
  totals.monthlyListeners === ids.reduce((sum, id) => sum + getTrackAnalytics(id, '28d').listeners, 0),
);
check('demo totals are deterministic', JSON.stringify(getArtistDemoTotals(ids)) === JSON.stringify(totals));
check('demo totals for no tracks are zero', JSON.stringify(getArtistDemoTotals([])) === JSON.stringify({ streams: 0, monthlyListeners: 0 }));

if (failures > 0) {
  console.error(`\n${failures} analytics-mock check(s) failed.`);
  process.exit(1);
}
console.log('\nAll analytics-mock checks passed.');
