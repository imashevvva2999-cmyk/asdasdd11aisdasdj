import { generatedArtworkByArtistId, resolveArtwork, stitchArtworkByArtistId } from '@/constants/stitch-artwork';

import type { Artist } from './types';

export const artists: Artist[] = [
  {
    id: 'solaris-echo',
    name: 'Solaris Echo',
    verified: true,
    monthlyListeners: 3_200_000,
    genres: ['Electronic', 'Ambient'],
    location: 'Bishkek, Kyrgyzstan',
    bio: 'Blending analog synths with mountainous ambient echoes from Central Asia. Solaris Echo has spent the last decade building a sound that sits between late-night club records and quiet-room listening.',
    popularTrackIds: ['midnight-mirage', 'horizon', 'obsidian-frequencies', 'ember-tide', 'resonant-field-reprise'],
    releaseAlbumIds: ['horizon-deluxe'],
    fansAlsoLikeIds: ['kaelen', 'arlo', 'maya-lin'],
  },
  { id: 'kaelen', name: 'Kaelen', monthlyListeners: 1_800_000, genres: ['Electronic'] },
  { id: 'arlo', name: 'Arlo', monthlyListeners: 540_000, genres: ['Ambient'] },
  { id: 'maya-lin', name: 'Maya Lin', monthlyListeners: 2_100_000, genres: ['Synthwave'] },
  { id: 'tate-vane', name: 'Tate Vane', monthlyListeners: 410_000, genres: ['Electronic'] },
  { id: 'clover-and-the-pulse', name: 'Clover & The Pulse', verified: true, monthlyListeners: 890_000, genres: ['Indie'] },
  { id: 'sable-duo', name: 'Sable Duo', monthlyListeners: 320_000, genres: ['Electronic'] },
  { id: 'yuki-tanaka', name: 'Yuki Tanaka', monthlyListeners: 610_000, genres: ['Dream Pop'] },
  { id: 'elena-rostova', name: 'Elena Rostova', monthlyListeners: 275_000, genres: ['Ambient'] },
  { id: 'nils-frahm', name: 'Nils Frahm', monthlyListeners: 4_500_000, genres: ['Neo-Classical'] },
];

// Fill in recovered Stitch artwork (Фаза 4 restoration pass) — a plain id
// lookup, not a require() of its own; see src/constants/stitch-artwork.ts.
// Falls back to a procedurally generated abstract avatar (frontend-wide
// artwork audit pass) only for artists with no recovered Stitch photo.
for (const artist of artists) {
  const photoUri = resolveArtwork(stitchArtworkByArtistId[artist.id], generatedArtworkByArtistId[artist.id]);
  if (photoUri) artist.photoUri = photoUri;
}

export function getArtistById(id: string): Artist | undefined {
  return artists.find((artist) => artist.id === id);
}

/**
 * Upsert into the same shared `artists` array `getArtistById` reads from
 * (Фаза 4, Batch 4 — docs/screens.md S-25…S-27). Used by the Artist frontend
 * store so a locally created/updated artist profile is immediately visible
 * to both the owner Dashboard (S-27) and the public Artist Profile (S-08) —
 * the same entity, not a duplicate model. Session-local only; nothing here
 * is persisted to a backend.
 */
export function addMockArtist(artist: Artist): void {
  const index = artists.findIndex((existing) => existing.id === artist.id);
  if (index >= 0) {
    artists[index] = artist;
  } else {
    artists.push(artist);
  }
}
