import type { Track } from './types';

export const tracks: Track[] = [
  { id: 'midnight-mirage', title: 'Midnight Mirage', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 258, lossless: true },
  { id: 'vapor-trails', title: 'Vapor Trails', artistId: 'overcast-skies', artistName: 'Overcast Skies', durationSec: 214, explicit: true },
  { id: 'abyssal-bloom', title: 'Abyssal Bloom', artistId: 'elena-rostova', artistName: 'Elena Rostova', durationSec: 236 },
  { id: 'tape-saturation-4', title: 'Tape Saturation #4', artistId: 'analog-dreamers', artistName: 'Analog Dreamers', durationSec: 198 },
  { id: 'horizon', title: 'Horizon', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 308 },
  { id: 'abyssal-bloom-feat', title: 'Abyssal Bloom', artistId: 'elena-rostova', artistName: 'Elena Rostova feat. Solaris Echo', durationSec: 236 },
  // Horizon (Deluxe) album — remaining tracklist (docs/screens.md §3.4 S-09).
  { id: 'obsidian-frequencies', title: 'Obsidian Frequencies', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 242, lossless: true },
  { id: 'ember-tide', title: 'Ember Tide', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 275 },
  { id: 'resonant-field-reprise', title: 'Resonant Field (Reprise)', artistId: 'solaris-echo', artistName: 'Solaris Echo', albumId: 'horizon-deluxe', durationSec: 189 },
  // Late Night Flow (editorial playlist) — mock tracklist (docs/screens.md §3.6 S-10/S-11).
  { id: 'nebula-dreams-t1', title: 'Nebula Dreams', artistId: 'kaelen', artistName: 'Kaelen', albumId: 'nebula-dreams', durationSec: 264 },
  { id: 'lost-frequencies-t1', title: 'Lost Frequencies', artistId: 'arlo', artistName: 'Arlo', albumId: 'lost-frequencies', durationSec: 231 },
  { id: 'velvet-skyline-t1', title: 'Velvet Skyline', artistId: 'maya-lin', artistName: 'Maya Lin', albumId: 'velvet-skyline', durationSec: 254, explicit: true },
  { id: 'chronos-echoes-t1', title: 'Chronos Echoes', artistId: 'tate-vane', artistName: 'Tate Vane', albumId: 'chronos-echoes', durationSec: 221 },
];

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
