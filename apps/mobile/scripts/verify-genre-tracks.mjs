#!/usr/bin/env node
/**
 * Genre-track derivation (locked GENRE_TAG_MAP → playable genres for the 2D
 * discovery player, Task 11 of the localization-and-discovery-player plan).
 * Usage: npx tsx scripts/verify-genre-tracks.mjs
 */
import { getPlayableGenreIds, getTrackIdsForGenre } from '../src/lib/genre-tracks.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const sameSet = (a, b) => a.length === b.length && new Set(a).size === new Set(b).size && a.every((id) => b.includes(id));

const ELECTRONIC_DANCE = [
  'midnight-mirage',
  'horizon',
  'obsidian-frequencies',
  'ember-tide',
  'resonant-field-reprise',
  'vapor-trails',
  'nebula-dreams-t1',
  'chronos-echoes-t1',
];

const CHILL_LOFI = [
  'midnight-mirage',
  'horizon',
  'obsidian-frequencies',
  'ember-tide',
  'resonant-field-reprise',
  'lost-frequencies-t1',
  'abyssal-bloom',
  'abyssal-bloom-feat',
  'tape-saturation-4',
];

check('electronic-dance resolves to exactly the 8 expected tracks', sameSet(getTrackIdsForGenre('electronic-dance'), ELECTRONIC_DANCE));
check('chill-lofi resolves to exactly the 9 expected tracks', sameSet(getTrackIdsForGenre('chill-lofi'), CHILL_LOFI));
check('pop (no mapping) has no tracks', getTrackIdsForGenre('pop').length === 0);
check('made-for-you (no mapping) has no tracks', getTrackIdsForGenre('made-for-you').length === 0);
check('an unknown genre id returns an empty list without throwing', (() => {
  try {
    return getTrackIdsForGenre('not-a-real-genre').length === 0;
  } catch {
    return false;
  }
})());

const KYRGYZ_MUSIC = [
  'kyrgyzstanym', 'muras', 'ene-til', 'alai', 'kachan-kaitat', 'jazym-kelchi',
  'kyrgyz-biyi', 'ne-segodnya', 'kirgiz-jeri', 'erke-kyz', 'chopo-choor-fantasy',
  'kyrgyzstanym-remix', 'jashtyk-kez', 'kambarkan', 'esimde', 'kyrgyz-bala',
  'taimuras', 'ananayyn', 'eto-lyubov', 'issyk-kulskiy-vaib',
];

check('kyrgyz-music resolves to exactly the 20 verified Kyrgyz tracks', sameSet(getTrackIdsForGenre('kyrgyz-music'), KYRGYZ_MUSIC));
check('no Kyrgyz track leaks into electronic-dance or chill-lofi', !getTrackIdsForGenre('electronic-dance').some((id) => KYRGYZ_MUSIC.includes(id)) && !getTrackIdsForGenre('chill-lofi').some((id) => KYRGYZ_MUSIC.includes(id)));

// Audio-first: genres with at least one demo-audio track come first (catalog
// order within each group), so Discover still opens on Electronic & Dance.
check(
  'getPlayableGenreIds() returns [electronic-dance, chill-lofi, kyrgyz-music] (audio genres first)',
  getPlayableGenreIds().join(',') === 'electronic-dance,chill-lofi,kyrgyz-music',
);

if (failures > 0) {
  console.error(`\n${failures} genre-tracks check(s) failed.`);
  process.exit(1);
}

console.log('\nAll genre-tracks checks passed.');
