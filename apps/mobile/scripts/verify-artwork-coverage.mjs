#!/usr/bin/env node
/**
 * Complete frontend-wide artwork audit pass — regression check. Scans every
 * known, statically-defined mock music dataset and fails if a normal
 * user-facing entity has no artwork SOURCE wired up, so a future
 * contributor adding a new mock album/track/playlist/artist/genre without
 * giving it an entry in src/constants/stitch-artwork.ts finds out
 * immediately instead of it silently falling back to the generic
 * music-note placeholder in the app.
 *
 * Checks MAP-KEY PRESENCE in the stitch/generated artwork maps, not the
 * resolved `coverUri`/`photoUri` runtime VALUE — `require('*.jpg')` always
 * throws under plain `tsx` (no Metro asset transform; `safeRequire` in
 * stitch-artwork.ts catches that and returns `undefined` for every image,
 * in every map, regardless of which one), so checking the resolved value
 * here would fail universally and tell us nothing. Whether a given image
 * actually loads is a Metro/runtime concern this script's host environment
 * doesn't have — already verified directly in a live browser for this
 * pass. What this script verifies instead is the data-completeness
 * question: does an artwork SOURCE exist for this id at all.
 *
 * Deliberately excludes dynamic/runtime-only content that has no fixed,
 * enumerable set to check ahead of time (locally-uploaded artist tracks
 * created via the Upload Track flow at runtime, with user-typed titles) —
 * those are allowed to use the UI's last-resort placeholder, per the same
 * policy src/constants/stitch-artwork.ts documents on `resolveArtwork`.
 *
 * Usage: npx tsx scripts/verify-artwork-coverage.mjs (or `pnpm run verify:artwork-coverage`)
 */
import {
  PENDING_ARTWORK_ARTIST_IDS,
  PENDING_ARTWORK_TRACK_IDS,
  generatedArtworkByAlbumId,
  generatedArtworkByArtistId,
  generatedArtworkByGenreId,
  generatedArtworkByPlaylistId,
  generatedArtworkByTrackId,
  stitchArtworkByAlbumId,
  stitchArtworkByArtistId,
  stitchArtworkByForYouTileId,
  stitchArtworkByGenreId,
  stitchArtworkByPlaylistId,
  stitchArtworkByTrackId,
} from '../src/constants/stitch-artwork.ts';
import { albums, artists, featuredGenre, forYouTiles, genres, playlists, tracks } from '../src/mocks/index.ts';

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

function hasKey(id, ...maps) {
  return maps.some((map) => Object.prototype.hasOwnProperty.call(map, id));
}

const albumHasArtwork = (id) => hasKey(id, stitchArtworkByAlbumId, generatedArtworkByAlbumId);

for (const album of albums) {
  check(`album "${album.title}" (${album.id}) has an artwork source`, albumHasArtwork(album.id));
}

for (const track of tracks) {
  const ownArtwork = hasKey(track.id, stitchArtworkByTrackId, generatedArtworkByTrackId);
  const albumArtwork = Boolean(track.albumId) && albumHasArtwork(track.albumId);
  if (PENDING_ARTWORK_TRACK_IDS.includes(track.id)) {
    check(`track "${track.title}" (${track.id}) is pending artwork and correctly has no artwork source`, !ownArtwork && !albumArtwork);
  } else {
    check(`track "${track.title}" (${track.id}) has an artwork source`, ownArtwork || albumArtwork);
  }
}

for (const playlist of playlists) {
  check(
    `playlist "${playlist.title}" (${playlist.id}) has an artwork source`,
    hasKey(playlist.id, stitchArtworkByPlaylistId, generatedArtworkByPlaylistId),
  );
}

for (const artist of artists) {
  const hasPhoto = hasKey(artist.id, stitchArtworkByArtistId, generatedArtworkByArtistId);
  if (PENDING_ARTWORK_ARTIST_IDS.includes(artist.id)) {
    check(`artist "${artist.name}" (${artist.id}) is pending artwork and correctly has no photo source`, !hasPhoto);
  } else {
    check(`artist "${artist.name}" (${artist.id}) has a photo source`, hasPhoto);
  }
}

check(`featured genre "${featuredGenre.title}" has an artwork source`, hasKey(featuredGenre.id, stitchArtworkByGenreId, generatedArtworkByGenreId));

for (const genre of genres) {
  check(`genre tile "${genre.title}" (${genre.id}) has an artwork source`, hasKey(genre.id, stitchArtworkByGenreId, generatedArtworkByGenreId));
}

for (const tile of forYouTiles) {
  check(`"For you" tile "${tile.title}" (${tile.id}) has an artwork source`, hasKey(tile.id, stitchArtworkByForYouTileId));
}

if (failures > 0) {
  console.error(`\n${failures} artwork-coverage check(s) failed.`);
  process.exit(1);
}

console.log('\nAll artwork-coverage checks passed.');
