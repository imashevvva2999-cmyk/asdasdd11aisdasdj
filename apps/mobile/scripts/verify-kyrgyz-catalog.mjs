#!/usr/bin/env node
/**
 * Kyrgyz catalog metadata entries (docs/superpowers/plans/
 * 2026-10-12-kyrgyz-track-catalog.md, Task 1). Usage:
 * npx tsx scripts/verify-kyrgyz-catalog.mjs
 */
import { artists } from '../src/mocks/artists.ts';
import { tracks } from '../src/mocks/tracks.ts';
import { hasDemoAudio } from '../src/audio/demo-audio.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const KYRGYZ_ARTIST_IDS = [
  'amirchik', 'mirbek-atabekov', 'bayastan', 'begish', 'gulnur-satylganova',
  'sultan-sadyraliev', 'ulukmanapo', 'salamat-sadikova', 'tengir-too',
  'nurlanbek-nyshanov', 'omar-zhanyshov', 'kairat-kyrgyz', 'nurak-abdrakhmanov',
  'toktobek-asanaliev', 'kiggaz', 'g-voo', 'tamga', 'aibek-zamirov', 'freeman996',
];
const KYRGYZ_TRACK_IDS = [
  'kyrgyzstanym', 'muras', 'ene-til', 'alai', 'kachan-kaitat', 'jazym-kelchi',
  'kyrgyz-biyi', 'ne-segodnya', 'kirgiz-jeri', 'erke-kyz', 'chopo-choor-fantasy',
  'kyrgyzstanym-remix', 'jashtyk-kez', 'kambarkan', 'esimde', 'kyrgyz-bala',
  'taimuras', 'ananayyn', 'eto-lyubov', 'issyk-kulskiy-vaib',
];

check('exactly 19 new Kyrgyz artists present', artists.filter((a) => KYRGYZ_ARTIST_IDS.includes(a.id)).length === 19);
check('exactly 20 new Kyrgyz tracks present', tracks.filter((t) => KYRGYZ_TRACK_IDS.includes(t.id)).length === 20);

const artistIds = new Set(artists.map((a) => a.id));
for (const trackId of KYRGYZ_TRACK_IDS) {
  const track = tracks.find((t) => t.id === trackId);
  check(`"${trackId}" exists in the tracks array`, !!track);
  if (track) check(`"${trackId}"'s artistId ("${track.artistId}") resolves to a real artist`, artistIds.has(track.artistId));
}

const allTrackIds = tracks.map((t) => t.id);
check('no duplicate track ids in the full catalog', new Set(allTrackIds).size === allTrackIds.length);
const allArtistIds = artists.map((a) => a.id);
check('no duplicate artist ids in the full catalog', new Set(allArtistIds).size === allArtistIds.length);

for (const trackId of KYRGYZ_TRACK_IDS) {
  check(`"${trackId}" has no demo audio (honest unavailable state, no audio supplied yet)`, hasDemoAudio(trackId) === false);
}

if (failures > 0) {
  console.error(`\n${failures} kyrgyz-catalog check(s) failed.`);
  process.exit(1);
}
console.log('\nAll kyrgyz-catalog checks passed.');
