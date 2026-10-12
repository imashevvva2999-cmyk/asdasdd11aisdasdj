#!/usr/bin/env node
/**
 * Artist Profile header meta line (S-08): listeners and location joined with
 * " • " only when both exist — never a leading separator. Usage:
 * npx tsx scripts/verify-artist-meta.mjs
 */
import { formatArtistMeta } from '../src/lib/artist-meta.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('both parts → joined with " • "', formatArtistMeta('3.2M monthly listeners', 'Bishkek, Kyrgyzstan') === '3.2M monthly listeners • Bishkek, Kyrgyzstan');
check('no listeners → location only, no leading separator', formatArtistMeta(undefined, 'Kyrgyzstan') === 'Kyrgyzstan');
check('no location → listeners only, no trailing separator', formatArtistMeta('540K monthly listeners', undefined) === '540K monthly listeners');
check('neither → empty string', formatArtistMeta(undefined, undefined) === '');
check('empty-string location is treated as absent', formatArtistMeta('1M monthly listeners', '') === '1M monthly listeners');

if (failures > 0) {
  console.error(`\n${failures} artist-meta check(s) failed.`);
  process.exit(1);
}
console.log('\nAll artist-meta checks passed.');
