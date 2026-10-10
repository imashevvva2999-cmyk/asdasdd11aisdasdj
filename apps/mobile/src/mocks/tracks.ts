import { generatedArtworkByTrackId, resolveArtwork, stitchArtworkByTrackId } from '@/constants/stitch-artwork';

import { albums } from './albums';
import type { Track } from './types';

export const tracks: Track[] = [
  { id: 'midnight-mirage', title: 'Midnight Mirage', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 240, lossless: true },
  { id: 'vapor-trails', title: 'Vapor Trails', artistId: 'overcast-skies', artistName: 'Overcast Skies', durationSec: 208, explicit: true },
  { id: 'abyssal-bloom', title: 'Abyssal Bloom', artistId: 'elena-rostova', artistName: 'Elena Rostova', albumId: 'still-water', durationSec: 152 },
  { id: 'tape-saturation-4', title: 'Tape Saturation #4', artistId: 'analog-dreamers', artistName: 'Analog Dreamers', durationSec: 236 },
  { id: 'horizon', title: 'Horizon', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 184 },
  { id: 'abyssal-bloom-feat', title: 'Abyssal Bloom', artistId: 'elena-rostova', artistName: 'Elena Rostova feat. Solaris Echo', durationSec: 198 },
  // Horizon (Deluxe) album — remaining tracklist (docs/screens.md §3.4 S-09).
  { id: 'obsidian-frequencies', title: 'Obsidian Frequencies', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 230, lossless: true },
  { id: 'ember-tide', title: 'Ember Tide', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 162 },
  { id: 'resonant-field-reprise', title: 'Resonant Field (Reprise)', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 177 },
  // Late Night Flow (editorial playlist) — mock tracklist (docs/screens.md §3.6 S-10/S-11).
  { id: 'nebula-dreams-t1', title: 'Nebula Dreams', artistId: 'kaelen', artistName: 'Kaelen', albumId: 'nebula-dreams', durationSec: 240 },
  { id: 'lost-frequencies-t1', title: 'Lost Frequencies', artistId: 'arlo', artistName: 'Arlo', albumId: 'lost-frequencies', durationSec: 264 },
  { id: 'velvet-skyline-t1', title: 'Velvet Skyline', artistId: 'maya-lin', artistName: 'Maya Lin', albumId: 'velvet-skyline', durationSec: 240, explicit: true },
  { id: 'chronos-echoes-t1', title: 'Chronos Echoes', artistId: 'tate-vane', artistName: 'Tate Vane', albumId: 'chronos-echoes', durationSec: 142 },
];

// Fill in recovered Stitch artwork (Фаза 4 restoration pass) — a plain id
// lookup, not a require() of its own; see src/constants/stitch-artwork.ts.
// Falls back to procedurally generated local artwork (Search Results visual
// cleanup pass) only for the handful of tracks with no recovered Stitch
// asset, so every screen reading `track.coverUri` picks it up consistently.
// A track with neither reuses its own album's cover when it has one and the
// album has real artwork (frontend-wide artwork audit pass) — e.g. the
// 'Nebula Dreams' track reuses the 'Nebula Dreams' album's cover, instead of
// generating a redundant second image for the same concept.
for (const track of tracks) {
  const albumCoverUri = track.albumId ? albums.find((album) => album.id === track.albumId)?.coverUri : undefined;
  const coverUri = resolveArtwork(stitchArtworkByTrackId[track.id], generatedArtworkByTrackId[track.id], albumCoverUri);
  if (coverUri) track.coverUri = coverUri;
}

export function getTrackById(id: string): Track | undefined {
  return tracks.find((track) => track.id === id);
}

/**
 * Insert into the same shared `tracks` array `getTrackById` reads from
 * (Фаза 4, Batch 4 — docs/screens.md S-28). Called by the Artist frontend
 * store only once a locally uploaded track reaches the `'published'` state —
 * this is what makes it resolvable (and playable via the shared player
 * store) by the exact same lookup every other screen already uses, instead
 * of a separate "artist track" model. Session-local only; nothing here is
 * persisted to a backend, transcoded, or uploaded anywhere.
 */
export function addMockTrack(track: Track): void {
  if (tracks.some((existing) => existing.id === track.id)) return;
  tracks.push(track);
}
