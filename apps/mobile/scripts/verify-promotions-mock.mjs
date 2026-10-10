#!/usr/bin/env node
/**
 * Promotion mock data: shape and invariant checks (mock campaign/tool data,
 * Artist Dashboard Promotion tab). Usage: npx tsx scripts/verify-promotions-mock.mjs
 */
import { ACTIVE_CAMPAIGN, CAMPAIGN_HISTORY, PROMO_TOOLS } from '../src/mocks/promotions.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('at least 3 promo tools, matching the Stitch mockup', PROMO_TOOLS.length >= 3);
check('every promo tool has a non-empty name, priceLabel, and description', PROMO_TOOLS.every((t) => t.name.length > 0 && t.priceLabel.length > 0 && t.description.length > 0));
check('every promo tool has a unique id', new Set(PROMO_TOOLS.map((t) => t.id)).size === PROMO_TOOLS.length);

check('active campaign reach never exceeds its goal in the mock (honest progress)', ACTIVE_CAMPAIGN.reach <= ACTIVE_CAMPAIGN.reachGoal);
check('active campaign progressPct matches reach/reachGoal', Math.round((ACTIVE_CAMPAIGN.reach / ACTIVE_CAMPAIGN.reachGoal) * 1000) / 10 === ACTIVE_CAMPAIGN.progressPct);
check('active campaign references a real catalog track id', typeof ACTIVE_CAMPAIGN.trackId === 'string' && ACTIVE_CAMPAIGN.trackId.length > 0);

check('at least 2 history entries', CAMPAIGN_HISTORY.length >= 2);
check('every history entry has a unique id', new Set(CAMPAIGN_HISTORY.map((h) => h.id)).size === CAMPAIGN_HISTORY.length);
check('every history entry has a positive reach', CAMPAIGN_HISTORY.every((h) => h.reach > 0));

if (failures > 0) {
  console.error(`\n${failures} promotions-mock check(s) failed.`);
  process.exit(1);
}
console.log('\nAll promotions-mock checks passed.');
