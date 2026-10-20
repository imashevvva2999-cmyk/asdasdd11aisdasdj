import { generatedArtworkByAlbumId, resolveArtwork, stitchArtworkByAlbumId } from '../constants/stitch-artwork';

import type { Album } from './types';

export const albums: Album[] = [
  { id: 'nebula-dreams', title: 'Nebula Dreams', artistId: 'kaelen', artistName: 'Kaelen', type: 'album', year: 2023, trackCount: 1, trackIds: ['nebula-dreams-t1'] },
  { id: 'lost-frequencies', title: 'Lost Frequencies', artistId: 'arlo', artistName: 'Arlo', type: 'album', year: 2024, trackCount: 1, trackIds: ['lost-frequencies-t1'] },
  { id: 'velvet-skyline', title: 'Velvet Skyline', artistId: 'maya-lin', artistName: 'Maya Lin', type: 'album', year: 2024, trackCount: 1, trackIds: ['velvet-skyline-t1'] },
  { id: 'chronos-echoes', title: 'Chronos Echoes', artistId: 'tate-vane', artistName: 'Tate Vane', type: 'album', year: 2023, trackCount: 1, trackIds: ['chronos-echoes-t1'] },
  // No catalog track is credited to this artist — stays explicitly empty rather than borrowing another artist's track (Phase 0, CEO demo audit item 1).
  { id: 'refraction-horizon', title: 'Refraction Horizon', artistId: 'clover-and-the-pulse', artistName: 'Clover & The Pulse', type: 'single', year: 2026, trackCount: 0 },
  { id: 'resonant-field', title: 'Resonant Field', artistId: 'sable-duo', artistName: 'Sable Duo', type: 'ep', year: 2026, trackCount: 0 },
  { id: 'solitary-echo', title: 'Solitary Echo', artistId: 'yuki-tanaka', artistName: 'Yuki Tanaka', type: 'album', year: 2025, trackCount: 0 },
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
  { id: 'neo-classical-horizons', title: 'Neo-Classical Horizons', artistId: 'nils-frahm', artistName: 'Nils Frahm', type: 'album', year: 2022, trackCount: 0 },
  // Home See All "Singles" filter needs more than one single to be meaningful.
  // Afterimage reuses the catalog's only Tate Vane track — an honest "also on" case (same artist as Chronos Echoes), not a misattribution.
  { id: 'afterimage', title: 'Afterimage', artistId: 'tate-vane', artistName: 'Tate Vane', type: 'single', year: 2026, trackCount: 1, trackIds: ['chronos-echoes-t1'] },
  { id: 'still-water', title: 'Still Water', artistId: 'elena-rostova', artistName: 'Elena Rostova', type: 'single', year: 2026, trackCount: 1, trackIds: ['abyssal-bloom'] },
  { id: 'night-signal', title: 'Night Signal', artistId: 'sable-duo', artistName: 'Sable Duo', type: 'single', year: 2026, trackCount: 0 },
];

// Fill in recovered Stitch artwork (Фаза 4 restoration pass) — a plain id
// lookup, not a require() of its own; see src/constants/stitch-artwork.ts.
// Falls back to a procedurally generated cover (frontend-wide artwork audit
// pass) only for albums/singles with no recovered Stitch asset.
for (const album of albums) {
  const coverUri = resolveArtwork(stitchArtworkByAlbumId[album.id], generatedArtworkByAlbumId[album.id]);
  if (coverUri) album.coverUri = coverUri;
}

export function getAlbumById(id: string): Album | undefined {
  return albums.find((album) => album.id === id);
}
