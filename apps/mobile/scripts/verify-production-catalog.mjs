#!/usr/bin/env node
/**
 * Production catalog safety: with __DEV__ unset (what a production Metro or
 * Vite build sees through the fail-closed checks), the development-only
 * Ошондо import (rights not confirmed) must be absent from every catalog
 * export — tracks, artists, Kyrgyz ids, artwork keys and palettes, demo-audio
 * keys and credits — while the 20 verified Kyrgyz tracks stay exactly as they
 * are (listed, no audio, no artwork). Deliberately does NOT import dev-mode.mjs.
 *
 * Usage: npx tsx scripts/verify-production-catalog.mjs
 */
import { demoAudioCredits, hasDemoAudio } from '../src/audio/demo-audio.ts';
import * as audioKeys from '../src/audio/demo-audio-keys.ts';
import * as palettes from '../src/constants/artwork-palettes.ts';
import * as artwork from '../src/constants/stitch-artwork.ts';
import { getPlayableGenreIds, getTrackIdsForGenre } from '../src/lib/genre-tracks.ts';
import * as mocks from '../src/mocks/index.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('__DEV__ is not defined (production view)', typeof globalThis.__DEV__ === 'undefined');

const DEV_ONLY = ['oshondo', 'Ошондо', 'mirbek-atabekov-oshondo', 'kyrgyz/oshondo'];
const exportsText = JSON.stringify({ mocks, artwork, palettes, audioKeys, demoAudioCredits });
for (const needle of DEV_ONLY) check(`no "${needle}" in any production catalog export`, !exportsText.includes(needle));

check('production catalog has 33 tracks', mocks.tracks.length === 33);
check('no track with id "oshondo"', !mocks.tracks.some((t) => t.id === 'oshondo'));
const mirbek = mocks.artists.find((a) => a.id === 'mirbek-atabekov');
check('Мирбек Атабеков keeps his verified track only', JSON.stringify(mirbek?.popularTrackIds) === JSON.stringify(['muras']));

const KYRGYZ = audioKeys.PENDING_AUDIO_TRACK_IDS;
check('20 verified Kyrgyz tracks', KYRGYZ.length === 20 && new Set(KYRGYZ).size === 20);
check('KYRGYZ_TRACK_IDS is exactly the 20 verified tracks', JSON.stringify([...audioKeys.KYRGYZ_TRACK_IDS].sort()) === JSON.stringify([...KYRGYZ].sort()));
for (const id of KYRGYZ) {
  const track = mocks.tracks.find((t) => t.id === id);
  check(`Kyrgyz track "${id}" is listed, has no demo audio and no artwork`, Boolean(track) && !hasDemoAudio(id) && track.coverUri === undefined);
}
check('kyrgyz-music genre resolves to exactly the 20 verified tracks', JSON.stringify([...getTrackIdsForGenre('kyrgyz-music')].sort()) === JSON.stringify([...KYRGYZ].sort()));
check('playable genres in production: audio genres first, kyrgyz-music (no audio) last', getPlayableGenreIds().join(',') === 'electronic-dance,chill-lofi,kyrgyz-music');
check('13 playable demo tracks in production', mocks.tracks.filter((t) => hasDemoAudio(t.id)).length === 13);

if (failures > 0) {
  console.error(`\n${failures} production-catalog check(s) failed.`);
  process.exit(1);
}
console.log('\nAll production-catalog checks passed.');
