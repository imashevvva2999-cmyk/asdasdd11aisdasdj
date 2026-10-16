#!/usr/bin/env node
/**
 * Promotion mock data: shape and invariant checks (mock campaign/tool data,
 * Artist Dashboard Promotion tab). Usage: npx tsx scripts/verify-promotions-mock.mjs
 */
import { ACTIVE_CAMPAIGN, CAMPAIGN_HISTORY, PROMO_PACKAGES, PROMO_TOOLS } from '../src/mocks/promotions.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('at least 3 promo tools, matching the Stitch mockup', PROMO_TOOLS.length >= 3);
check(
  'every promo tool has a non-empty localized name, priceLabel, and description',
  PROMO_TOOLS.every(
    (t) =>
      t.name.en.length > 0 &&
      t.name.ru.length > 0 &&
      t.priceLabel.en.length > 0 &&
      t.priceLabel.ru.length > 0 &&
      t.description.en.length > 0 &&
      t.description.ru.length > 0,
  ),
);
check(
  'every promo tool badge, when present, is localized en/ru',
  PROMO_TOOLS.every((t) => t.badge === undefined || (t.badge.en.length > 0 && t.badge.ru.length > 0)),
);
check('every promo tool has a unique id', new Set(PROMO_TOOLS.map((t) => t.id)).size === PROMO_TOOLS.length);

check('active campaign reach never exceeds its goal in the mock (honest progress)', ACTIVE_CAMPAIGN.reach <= ACTIVE_CAMPAIGN.reachGoal);
check('active campaign progressPct matches reach/reachGoal', Math.round((ACTIVE_CAMPAIGN.reach / ACTIVE_CAMPAIGN.reachGoal) * 1000) / 10 === ACTIVE_CAMPAIGN.progressPct);
check('active campaign references a real catalog track id', typeof ACTIVE_CAMPAIGN.trackId === 'string' && ACTIVE_CAMPAIGN.trackId.length > 0);
check('active campaign dayOfTotal is localized en/ru', ACTIVE_CAMPAIGN.dayOfTotal.en.length > 0 && ACTIVE_CAMPAIGN.dayOfTotal.ru.length > 0);

check('at least 2 history entries', CAMPAIGN_HISTORY.length >= 2);
check('every history entry has a unique id', new Set(CAMPAIGN_HISTORY.map((h) => h.id)).size === CAMPAIGN_HISTORY.length);
check('every history entry has a positive reach', CAMPAIGN_HISTORY.every((h) => h.reach > 0));
check(
  'every history entry has a localized metric and completedLabel',
  CAMPAIGN_HISTORY.every((h) => h.metric.en.length > 0 && h.metric.ru.length > 0 && h.completedLabel.en.length > 0 && h.completedLabel.ru.length > 0),
);

check('exactly 4 promo packages (START/BOOST/PRO/SPOTLIGHT)', PROMO_PACKAGES.length === 4);
check('every promo package has a unique id', new Set(PROMO_PACKAGES.map((p) => p.id)).size === PROMO_PACKAGES.length);
check('promo package prices strictly increase with id order', PROMO_PACKAGES.every((p, i) => i === 0 || p.priceKgs > PROMO_PACKAGES[i - 1].priceKgs));
check('the free tier is priced at 0', PROMO_PACKAGES[0].priceKgs === 0);
check(
  'every promo package has a localized forecastLabel and at least one localized feature',
  PROMO_PACKAGES.every(
    (p) => p.forecastLabel.en.length > 0 && p.forecastLabel.ru.length > 0 && p.features.length > 0 && p.features.every((f) => f.en.length > 0 && f.ru.length > 0),
  ),
);
check('every promo package forecastHigh is >= forecastLow', PROMO_PACKAGES.every((p) => p.forecastHigh >= p.forecastLow));
check('at most one promo package is the recommended (highlighted) tier', PROMO_PACKAGES.filter((p) => p.highlighted).length <= 1);
check('at most one promo package is the premium (flagship) tier', PROMO_PACKAGES.filter((p) => p.premium).length <= 1);
check('no promo package is both highlighted and premium (one accent each, never both)', PROMO_PACKAGES.every((p) => !(p.highlighted && p.premium)));

check('active campaign geoBreakdown percentages sum to 100 or less', !ACTIVE_CAMPAIGN.geoBreakdown || ACTIVE_CAMPAIGN.geoBreakdown.reduce((sum, g) => sum + g.pct, 0) <= 100);
check(
  'active campaign geoBreakdown counts are consistent with reach and pct (±1 rounding)',
  !ACTIVE_CAMPAIGN.geoBreakdown ||
    ACTIVE_CAMPAIGN.geoBreakdown.every((g) => Math.abs(g.count - Math.round((ACTIVE_CAMPAIGN.reach * g.pct) / 100)) <= 1),
);

if (failures > 0) {
  console.error(`\n${failures} promotions-mock check(s) failed.`);
  process.exit(1);
}
console.log('\nAll promotions-mock checks passed.');
