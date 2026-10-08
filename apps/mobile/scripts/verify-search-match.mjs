#!/usr/bin/env node
/**
 * Tests for the shared text-matching rule (src/lib/search-match.ts) used by
 * Search results and Library search, so both behave the same. Same approach
 * as the other verify-*.mjs scripts: real module via `tsx`, plain asserts.
 *
 * Usage: npx tsx scripts/verify-search-match.mjs
 */
import { matchesQuery, normalizeQuery } from '../src/lib/search-match.ts';

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('normalizeQuery trims and lowercases', normalizeQuery('  Solaris ECHO ') === 'solaris echo');
check('empty query matches everything', matchesQuery('', 'Horizon'));
check('whitespace-only query matches everything', matchesQuery('   ', 'Horizon'));
check('matching is case-insensitive', matchesQuery('HORIZON', 'Horizon (Deluxe)'));
check('matches a substring anywhere', matchesQuery('luxe', 'Horizon (Deluxe)'));
check('matches any of several fields', matchesQuery('solaris', 'Horizon', 'Solaris Echo'));
check('surrounding spaces in the query are ignored', matchesQuery('  echo ', 'Solaris Echo'));
check('no match returns false', !matchesQuery('jazz', 'Horizon', 'Solaris Echo'));
check('missing fields are skipped safely', matchesQuery('echo', undefined, 'Solaris Echo') && !matchesQuery('echo', undefined));
check('matches Cyrillic text case-insensitively', matchesQuery('КОМУЗ', 'Звуки комуза'));

if (failures > 0) {
  console.error(`\n${failures} search-match check(s) failed.`);
  process.exit(1);
}
console.log('\nAll search-match checks passed.');
