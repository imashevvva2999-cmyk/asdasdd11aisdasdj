import { stitchArtworkByAlbumId } from '@/constants/stitch-artwork';

import type { Album } from './types';

export const albums: Album[] = [
  { id: 'nebula-dreams', title: 'Nebula Dreams', artistId: 'kaelen', artistName: 'Kaelen', type: 'album', year: 2023, trackCount: 12 },
  { id: 'lost-frequencies', title: 'Lost Frequencies', artistId: 'arlo', artistName: 'Arlo', type: 'album', year: 2024, trackCount: 10 },
  { id: 'velvet-skyline', title: 'Velvet Skyline', artistId: 'maya-lin', artistName: 'Maya Lin', type: 'album', year: 2024, trackCount: 14 },
  { id: 'chronos-echoes', title: 'Chronos Echoes', artistId: 'tate-vane', artistName: 'Tate Vane', type: 'album', year: 2023, trackCount: 10 },
  { id: 'refraction-horizon', title: 'Refraction Horizon', artistId: 'clover-and-the-pulse', artistName: 'Clover & The Pulse', type: 'single', year: 2026, trackCount: 1 },
  { id: 'resonant-field', title: 'Resonant Field', artistId: 'sable-duo', artistName: 'Sable Duo', type: 'ep', year: 2026, trackCount: 5 },
  { id: 'solitary-echo', title: 'Solitary Echo', artistId: 'yuki-tanaka', artistName: 'Yuki Tanaka', type: 'album', year: 2025, trackCount: 11 },
  {
    id: 'horizon-deluxe',
    title: 'Horizon (Deluxe)',
    artistId: 'solaris-echo',
    artistName: 'Solaris Echo',
    type: 'album',
    year: 2024,
    trackCount: 6,
    trackIds: ['midnight-mirage', 'horizon', 'obsidian-frequencies', 'ember-tide', 'resonant-field-reprise', 'abyssal-bloom-feat'],
  },
  { id: 'neo-classical-horizons', title: 'Neo-Classical Horizons', artistId: 'nils-frahm', artistName: 'Nils Frahm', type: 'album', year: 2022, trackCount: 9 },
];

// Fill in recovered Stitch artwork (Фаза 4 restoration pass) — a plain id
// lookup, not a require() of its own; see src/constants/stitch-artwork.ts.
for (const album of albums) {
  const coverUri = stitchArtworkByAlbumId[album.id];
  if (coverUri) album.coverUri = coverUri;
}

export function getAlbumById(id: string): Album | undefined {
  return albums.find((album) => album.id === id);
}
