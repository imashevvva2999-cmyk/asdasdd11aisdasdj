#!/usr/bin/env node
/**
 * Album/track-list data integrity (Phase 0, CEO demo reliability — item 1):
 * every album's trackCount matches its real trackIds, and every assigned
 * track is credited to that album's own artist — never fabricated or
 * misattributed. Usage: npx tsx scripts/verify-album-tracks.mjs
 */
import { albums } from '../src/mocks/albums.ts';
import { tracks } from '../src/mocks/tracks.ts';
import { playlists } from '../src/mocks/playlists.ts';
import { hasDemoAudio } from '../src/audio/demo-audio.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const trackById = new Map(tracks.map((t) => [t.id, t]));

/** True credit (the track's own primary artist) or an honest "feat." credit
 * (the album's artist named in the track's own artistName) — never a track
 * silently moved to an unrelated artist's release. */
function creditedToAlbumArtist(track, album) {
  if (track.artistId === album.artistId) return true;
  return track.artistName.toLowerCase().includes(`feat. ${album.artistName.toLowerCase()}`);
}

for (const album of albums) {
  const trackIds = album.trackIds ?? [];
  check(`"${album.title}": trackCount (${album.trackCount}) matches trackIds.length (${trackIds.length})`, album.trackCount === trackIds.length);
  for (const trackId of trackIds) {
    const track = trackById.get(trackId);
    check(`"${album.title}": track "${trackId}" exists in the catalog`, !!track);
    if (track) check(`"${album.title}": track "${trackId}" is honestly credited (own artist or a labelled "feat." credit) to ${album.artistId}`, creditedToAlbumArtist(track, album));
  }
}

const emptyExpected = ['refraction-horizon', 'night-signal', 'resonant-field', 'solitary-echo', 'neo-classical-horizons'];
for (const id of emptyExpected) {
  const album = albums.find((a) => a.id === id);
  check(`"${album.title}" has no catalog track by its own artist, so it is explicitly empty (trackCount 0)`, album.trackCount === 0 && (album.trackIds ?? []).length === 0);
}

const populatedExpected = ['horizon-deluxe', 'nebula-dreams', 'lost-frequencies', 'velvet-skyline', 'chronos-echoes', 'afterimage', 'still-water'];
for (const id of populatedExpected) {
  const album = albums.find((a) => a.id === id);
  check(`"${album.title}" has at least one real track`, (album.trackIds ?? []).length > 0);
}

const hero = playlists.find((p) => p.id === 'late-night-flow');
check('the Home hero playlist exists', !!hero);
if (hero) {
  check("the Home hero playlist's first track has real demo audio (Play must launch something playable)", hasDemoAudio(hero.trackIds?.[0]));
  check("the Home hero playlist's trackCount matches its trackIds.length", hero.trackCount === (hero.trackIds ?? []).length);
}

if (failures > 0) {
  console.error(`\n${failures} album-tracks check(s) failed.`);
  process.exit(1);
}
console.log('\nAll album-tracks checks passed.');
