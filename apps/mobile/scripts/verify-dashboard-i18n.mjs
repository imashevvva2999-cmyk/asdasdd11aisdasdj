#!/usr/bin/env node
/**
 * Dashboard EN/RU string table: every key present in both languages, no
 * empty strings. Usage: npx tsx scripts/verify-dashboard-i18n.mjs
 */
import { DASHBOARD_STRINGS } from '../src/lib/dashboard-i18n.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const enKeys = Object.keys(DASHBOARD_STRINGS.en);
const ruKeys = Object.keys(DASHBOARD_STRINGS.ru);
check('en and ru have exactly the same set of keys', enKeys.length === ruKeys.length && enKeys.every((k) => ruKeys.includes(k)));
check('every en string is non-empty', Object.values(DASHBOARD_STRINGS.en).every((v) => typeof v === 'string' && v.length > 0));
check('every ru string is non-empty', Object.values(DASHBOARD_STRINGS.ru).every((v) => typeof v === 'string' && v.length > 0));
check('at least 30 keys (covers tab labels, stats, FAQ, etc.)', enKeys.length >= 30);
check('en and ru actually differ for every key (no copy-pasted English)', enKeys.every((k) => DASHBOARD_STRINGS.en[k] !== DASHBOARD_STRINGS.ru[k]));

if (failures > 0) {
  console.error(`\n${failures} dashboard-i18n check(s) failed.`);
  process.exit(1);
}
console.log('\nAll dashboard-i18n checks passed.');
