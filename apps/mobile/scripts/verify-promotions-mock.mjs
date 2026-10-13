#!/usr/bin/env node
/**
 * Promotion mock data: shape and invariant checks (mock campaign/tool data,
 * Artist Dashboard Promotion tab). Usage: npx tsx scripts/verify-promotions-mock.mjs
 */
import { PROMO_TOOLS } from '../src/mocks/promotions.ts';

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

if (failures > 0) {
  console.error(`\n${failures} promotions-mock check(s) failed.`);
  process.exit(1);
}
console.log('\nAll promotions-mock checks passed.');
