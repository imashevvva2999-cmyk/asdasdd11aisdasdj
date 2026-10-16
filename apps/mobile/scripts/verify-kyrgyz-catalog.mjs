#!/usr/bin/env node
/**
 * Kyrgyz catalog metadata entries (docs/superpowers/plans/
 * 2026-10-12-kyrgyz-track-catalog.md, Task 1). Usage:
 * npx tsx scripts/verify-kyrgyz-catalog.mjs
 */
import { artists } from '../src/mocks/artists.ts';
import { tracks } from '../src/mocks/tracks.ts';
import { PENDING_ARTWORK_ARTIST_IDS, PENDING_ARTWORK_TRACK_IDS } from '../src/constants/stitch-artwork.ts';
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

// No invented durations: only a confirmed length is recorded; the rest are unknown.
const CONFIRMED_DURATIONS = { kyrgyzstanym: 135 };
for (const trackId of KYRGYZ_TRACK_IDS) {
  const track = tracks.find((t) => t.id === trackId);
  const expected = CONFIRMED_DURATIONS[trackId];
  check(
    expected === undefined ? `"${trackId}" has no placeholder duration (unknown)` : `"${trackId}" keeps its confirmed duration (${expected}s)`,
    track?.durationSec === expected,
  );
}

const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && a.every((x) => b.includes(x));
check('PENDING_ARTWORK_TRACK_IDS equals the Kyrgyz track ids', sameSet(PENDING_ARTWORK_TRACK_IDS, KYRGYZ_TRACK_IDS));
check('PENDING_ARTWORK_ARTIST_IDS equals the Kyrgyz artist ids', sameSet(PENDING_ARTWORK_ARTIST_IDS, KYRGYZ_ARTIST_IDS));

for (const artistId of KYRGYZ_ARTIST_IDS) {
  const artist = artists.find((a) => a.id === artistId);
  const ids = artist?.popularTrackIds ?? [];
  check(`"${artistId}" has at least one popularTrackId`, ids.length >= 1);
  for (const id of ids) {
    const track = tracks.find((t) => t.id === id);
    check(`"${artistId}" popularTrackId "${id}" is a Kyrgyz track by that artist`, !!track && KYRGYZ_TRACK_IDS.includes(id) && track.artistId === artistId);
  }
}

if (failures > 0) {
  console.error(`\n${failures} kyrgyz-catalog check(s) failed.`);
  process.exit(1);
}
console.log('\nAll kyrgyz-catalog checks passed.');
