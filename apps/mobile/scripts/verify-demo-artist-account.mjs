#!/usr/bin/env node
/**
 * Demo artist account metrics (Artist Dashboard Overview/Analytics growth
 * badges). Usage: npx tsx scripts/verify-demo-artist-account.mjs
 */
import { getDemoAccountMetrics, DEMO_RELEASES } from '../src/mocks/demo-artist-account.ts';
import { getTrackAnalytics } from '../src/lib/analytics-mock.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const trackIds = DEMO_RELEASES.map((r) => r.id);
const metrics = getDemoAccountMetrics(trackIds);
const perTrack28d = trackIds.map((id) => getTrackAnalytics(id, '28d'));
const minStreamsDelta = Math.min(...perTrack28d.map((d) => d.streamsDeltaPct));
const maxStreamsDelta = Math.max(...perTrack28d.map((d) => d.streamsDeltaPct));
const minListenersDelta = Math.min(...perTrack28d.map((d) => d.listenersDeltaPct));
const maxListenersDelta = Math.max(...perTrack28d.map((d) => d.listenersDeltaPct));

check(
  'streamsDeltaPct is a weighted average within the per-track min/max range',
  metrics.streamsDeltaPct >= minStreamsDelta && metrics.streamsDeltaPct <= maxStreamsDelta,
);
check(
  'listenersDeltaPct is a weighted average within the per-track min/max range',
  metrics.listenersDeltaPct >= minListenersDelta && metrics.listenersDeltaPct <= maxListenersDelta,
);
check('getDemoAccountMetrics([]) does not throw and has zero deltas', (() => {
  const empty = getDemoAccountMetrics([]);
  return empty.streamsDeltaPct === 0 && empty.listenersDeltaPct === 0 && empty.streams === 0;
})());
check(
  'deltas are deterministic across calls',
  JSON.stringify(getDemoAccountMetrics(trackIds)) === JSON.stringify(getDemoAccountMetrics(trackIds)),
);

if (failures > 0) {
  console.error(`\n${failures} demo-artist-account check(s) failed.`);
  process.exit(1);
}
console.log('\nAll demo-artist-account checks passed.');
