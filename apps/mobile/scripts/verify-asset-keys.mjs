#!/usr/bin/env node
/**
 * W2.4a asset keys: catalog artwork and demo audio are referenced by stable
 * keys (`asset:<path under assets/artwork>`, `audio:<path under assets/audio>`)
 * instead of `require()` results. This checks that every key the catalog uses
 * has exactly one entry in the Expo app's static `require()` table, that the
 * table entry requires the file the key names, that the file exists, and that
 * the dev-only Kyrgyz test assets stay behind `__DEV__`.
 *
 * Usage: npx tsx scripts/verify-asset-keys.mjs
 */
import './dev-mode.mjs'; // checks development-only (Ошондо) content
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { demoAudioCredits } from '../src/audio/demo-audio.ts';
import { demoAudioKeys } from '../src/audio/demo-audio-keys.ts';
import { artworkSources, toImageSource } from '../src/constants/artwork-sources.ts';
import * as artwork from '../src/constants/stitch-artwork.ts';
import { albums, artists, featuredGenre, forYouTiles, genres, playlists, tracks } from '../src/mocks/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const liveLines = (file) =>
  readFileSync(join(root, file), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

// --- Artwork: the require() table -------------------------------------------
const artworkTableSrc = liveLines('src/constants/artwork-sources.ts');
const artworkTable = [...artworkTableSrc.matchAll(/'asset:([^']+)':\s*safeRequire\(\(\) => require\('\.\.\/\.\.\/assets\/artwork\/([^']+)'\)\)/g)];
check('artwork table: one require() per key in artworkSources', artworkTable.length === Object.keys(artworkSources).length && artworkTable.length > 0);
check('artwork table: no duplicate keys', new Set(artworkTable.map(([, key]) => key)).size === artworkTable.length);
for (const [, keyPath, requiredPath] of artworkTable) {
  check(`artwork table: asset:${keyPath} requires the file it names`, keyPath === requiredPath);
  const file = join(root, 'assets/artwork', requiredPath);
  check(`artwork table: assets/artwork/${requiredPath} exists and is non-empty`, existsSync(file) && statSync(file).size > 0);
}

// --- Artwork: every key the catalog maps use --------------------------------
const MAPS = Object.entries(artwork).filter(([name, value]) => /^(stitch|generated)ArtworkBy\w+Id$/.test(name) && value && typeof value === 'object');
check('artwork maps found (11)', MAPS.length === 11);
const usedKeys = new Set();
for (const [name, map] of MAPS) {
  for (const [id, value] of Object.entries(map)) {
    usedKeys.add(value);
    check(`${name}["${id}"] is an artwork key with a table entry`, artwork.isArtworkKey(value) && Object.hasOwn(artworkSources, value));
  }
}
for (const [index, value] of artwork.sampleImageChoices.entries()) {
  usedKeys.add(value);
  check(`sampleImageChoices[${index}] is an artwork key with a table entry`, artwork.isArtworkKey(value) && Object.hasOwn(artworkSources, value));
}
check('artwork table has no unused entries', Object.keys(artworkSources).every((key) => usedKeys.has(key)));

// --- Artwork: every catalog entity resolves to a key (or is pending by design)
function coverCheck(kind, entity, value, pending = false) {
  const name = entity.title ?? entity.name;
  if (pending) check(`${kind} "${name}" (${entity.id}) is pending artwork and has none`, value === undefined);
  else check(`${kind} "${name}" (${entity.id}) resolves to a bundled artwork key`, artwork.isArtworkKey(value) && Object.hasOwn(artworkSources, value));
}
for (const album of albums) coverCheck('album', album, album.coverUri);
for (const track of tracks) coverCheck('track', track, track.coverUri, artwork.PENDING_ARTWORK_TRACK_IDS.includes(track.id));
for (const playlist of playlists) coverCheck('playlist', playlist, playlist.coverUri);
for (const artist of artists) coverCheck('artist', artist, artist.photoUri, artwork.PENDING_ARTWORK_ARTIST_IDS.includes(artist.id));
for (const genre of [featuredGenre, ...genres]) coverCheck('genre', genre, genre.coverUri);
for (const tile of forYouTiles) coverCheck('"For you" tile', tile, tile.coverUri);

// --- Audio ------------------------------------------------------------------
const audioTableSrc = liveLines('src/audio/demo-sources.ts');
const audioTable = [...audioTableSrc.matchAll(/'audio:([^']+)':\s*require\('\.\.\/\.\.\/assets\/audio\/([^']+)'\)/g)];
const audioTableKeys = new Set(audioTable.map(([, key]) => key));
check('audio table: no duplicate keys', audioTableKeys.size === audioTable.length && audioTable.length > 0);
for (const [, keyPath, requiredPath] of audioTable) {
  check(`audio table: audio:${keyPath} requires the file it names`, keyPath === requiredPath);
  const file = join(root, 'assets/audio', requiredPath);
  check(`audio table: assets/audio/${requiredPath} exists and is non-empty`, existsSync(file) && statSync(file).size > 0);
}
const audioKeys = Object.entries(demoAudioKeys);
check('every demo-audio credit has an audio key, and only those', audioKeys.length === Object.keys(demoAudioCredits).length && audioKeys.every(([id]) => id in demoAudioCredits));
for (const [id, key] of audioKeys) {
  check(`track "${id}" audio key ${key} has a table entry`, key.startsWith('audio:') && audioTableKeys.has(key.slice('audio:'.length)));
}
check('audio table has no unused entries', [...audioTableKeys].every((key) => audioKeys.some(([, used]) => used === `audio:${key}`)));
check('every audio key names a distinct file', new Set(audioKeys.map(([, key]) => key)).size === audioKeys.length);

// --- Dev-only assets (rights not confirmed) stay behind __DEV__ ---------------
const DEV_ONLY = [
  ['../../core/constants/stitch-artwork.ts', "oshondo: 'asset:tracks/mirbek-atabekov-oshondo.png'"],
  ['src/constants/artwork-sources.ts', "'asset:tracks/mirbek-atabekov-oshondo.png': safeRequire"],
  ['../../core/audio/demo-audio-keys.ts', "oshondo: 'audio:kyrgyz/oshondo.mp3'"],
  ['src/audio/demo-sources.ts', "'audio:kyrgyz/oshondo.mp3': require"],
];
for (const [file, entry] of DEV_ONLY) {
  const src = readFileSync(join(root, file), 'utf8');
  const at = src.indexOf(entry);
  const guard = src.lastIndexOf('__DEV__', at);
  // `__DEV__ ? { <entry> } : {}` — possibly wrapped over lines.
  const opens = /^__DEV__\s*\?\s*\{\s*$/.test(src.slice(guard, at));
  const closes = /^[^\n]*\}\s*:\s*\{\}\)/.test(src.slice(at).replace(/\n\s*/, ' '));
  check(`${file}: dev-only entry is inside a __DEV__ ? … : {} spread`, at > 0 && guard > 0 && opens && closes);
}

// --- toImageSource ------------------------------------------------------------
check('toImageSource: a remote URL string becomes { uri }', JSON.stringify(toImageSource('https://example.com/a.jpg')) === '{"uri":"https://example.com/a.jpg"}');
check('toImageSource: an already-bundled object passes through', JSON.stringify(toImageSource({ uri: '/assets/a.jpg', width: 1, height: 1 })) === '{"uri":"/assets/a.jpg","width":1,"height":1}');
check('toImageSource: a module number passes through', toImageSource(7) === 7);
check('toImageSource: a key with no bundled file never requests the key itself', JSON.stringify(toImageSource('asset:no-such.jpg')) === '{"uri":""}');

if (failures > 0) {
  console.error(`\n${failures} asset-key check(s) failed.`);
  process.exit(1);
}
console.log('\nAll asset-key checks passed.');
