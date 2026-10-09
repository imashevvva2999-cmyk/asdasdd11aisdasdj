#!/usr/bin/env node
/**
 * Support History dates (src/lib/support-dates.ts): the static (server +
 * hydration) render must be identical in every time zone and locale — it is
 * what the build machine writes into the HTML — while the live render (after
 * hydration) uses the visitor's time zone and "Today" / "Last Week".
 * Usage: npx tsx scripts/verify-support-dates.mjs
 */
import { groupSupportHistory, supportDateLabel, supportPeriodLabel } from '../src/lib/support-dates.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const STATIC = { kind: 'static' };
const entries = [
  { id: 'a', createdAt: '2026-10-08T21:30:00.000Z' },
  { id: 'b', createdAt: '2026-10-02T09:05:00.000Z' },
  { id: 'c', createdAt: '2026-09-14T00:00:00.000Z' },
];

// Static render: the same text whatever the machine's time zone (the build runs in UTC on Vercel, visitors anywhere).
const zones = ['UTC', 'Asia/Bishkek', 'America/Los_Angeles', 'Pacific/Kiritimati'];
const staticRuns = zones.map((tz) => {
  process.env.TZ = tz;
  return JSON.stringify({ d: entries.map((e) => supportDateLabel(e.createdAt, STATIC)), g: groupSupportHistory(entries, STATIC).map(([k, v]) => [k, v.map((e) => e.id)]) });
});
check(`static render is identical in ${zones.length} time zones`, staticRuns.every((r) => r === staticRuns[0]));
check('static date label is fixed English, UTC: "Oct 8, 9:30 PM"', supportDateLabel(entries[0].createdAt, STATIC) === 'Oct 8, 9:30 PM');
check('midnight reads 12:00 AM, morning keeps one digit: "Sep 14, 12:00 AM" / "Oct 2, 9:05 AM"', supportDateLabel(entries[2].createdAt, STATIC) === 'Sep 14, 12:00 AM' && supportDateLabel(entries[1].createdAt, STATIC) === 'Oct 2, 9:05 AM');
check('static grouping is by month only (no "Today": it would depend on the build date)', JSON.stringify(groupSupportHistory(entries, STATIC).map(([k]) => k)) === JSON.stringify(['October 2026', 'September 2026']));

// Live render (after hydration): the visitor's time zone and relative periods.
process.env.TZ = 'Asia/Bishkek'; // UTC+6
const live = { kind: 'live', now: new Date('2026-10-09T08:00:00.000Z') };
check('live date label uses the visitor time zone (Bishkek: "Oct 9, 3:30 AM")', supportDateLabel(entries[0].createdAt, live) === 'Oct 9, 3:30 AM');
check('live: an entry from earlier today (local) is "Today"', supportPeriodLabel(entries[0].createdAt, live) === 'Today');
check('live: within the last 7 days is "Last Week"', supportPeriodLabel(entries[1].createdAt, live) === 'Last Week');
check('live: older entries are grouped by month', supportPeriodLabel(entries[2].createdAt, live) === 'September 2026');
check('groups keep the history order', JSON.stringify(groupSupportHistory(entries, live).map(([k]) => k)) === JSON.stringify(['Today', 'Last Week', 'September 2026']));
check('an invalid date never throws', typeof supportDateLabel('not a date', STATIC) === 'string' && typeof supportPeriodLabel('not a date', live) === 'string');

if (failures > 0) {
  console.error(`\n${failures} support-dates check(s) failed.`);
  process.exit(1);
}
console.log('\nAll support-dates checks passed.');
