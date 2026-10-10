#!/usr/bin/env node
/**
 * Like-persistence round-trip (Phase 0, CEO demo reliability — item 5):
 * a Set survives JSON (de)serialization, and malformed/missing stored data
 * never throws — it degrades to an empty Set. Usage: npx tsx scripts/verify-liked-tracks-storage.mjs
 */
import { deserializeLikedTrackIds, serializeLikedTrackIds } from '../src/lib/liked-tracks-storage.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('serializes an empty Set to an empty array', JSON.stringify(serializeLikedTrackIds(new Set())) === '[]');
check('serializes a populated Set to an array of its members', (() => {
  const arr = serializeLikedTrackIds(new Set(['midnight-mirage', 'horizon']));
  return arr.length === 2 && arr.includes('midnight-mirage') && arr.includes('horizon');
})());
check('round-trips through JSON exactly', (() => {
  const original = new Set(['a', 'b', 'c']);
  const roundTripped = deserializeLikedTrackIds(JSON.parse(JSON.stringify(serializeLikedTrackIds(original))));
  return roundTripped.size === 3 && ['a', 'b', 'c'].every((id) => roundTripped.has(id));
})());
check('deserializing undefined (nothing stored yet) gives an empty Set, not a throw', deserializeLikedTrackIds(undefined).size === 0);
check('deserializing null gives an empty Set, not a throw', deserializeLikedTrackIds(null).size === 0);
check('deserializing a malformed non-array value gives an empty Set, not a throw', deserializeLikedTrackIds({ not: 'an array' }).size === 0);
check('deserializing an array with non-string entries filters them out, not a throw', (() => {
  const result = deserializeLikedTrackIds(['valid-id', 42, null, 'another-valid-id']);
  return result.size === 2 && result.has('valid-id') && result.has('another-valid-id');
})());

if (failures > 0) {
  console.error(`\n${failures} liked-tracks-storage check(s) failed.`);
  process.exit(1);
}
console.log('\nAll liked-tracks-storage checks passed.');
