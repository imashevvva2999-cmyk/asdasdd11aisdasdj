#!/usr/bin/env node
/**
 * KGS amount formatting (Phase 0, CEO demo reliability — item 6):
 * thousands separators, no currency unit (call sites keep their own "сом").
 * Usage: npx tsx scripts/verify-format-currency.mjs
 */
import { formatKgsAmount } from '../src/lib/format-currency.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('formats a large amount with thousands separators', formatKgsAmount(15000) === '15,000');
check('formats an amount at the stated 3,000 threshold', formatKgsAmount(3000) === '3,000');
check('formats a small amount with no separator needed', formatKgsAmount(50) === '50');
check('formats zero', formatKgsAmount(0) === '0');
check('formats a very large amount with multiple separators', formatKgsAmount(1250000) === '1,250,000');
check('does not show decimals for a whole-number amount', formatKgsAmount(4250) === '4,250');
check('rounds a fractional amount to the nearest whole unit', formatKgsAmount(100.5) === '101' || formatKgsAmount(100.5) === '100');

if (failures > 0) {
  console.error(`\n${failures} format-currency check(s) failed.`);
  process.exit(1);
}
console.log('\nAll format-currency checks passed.');
