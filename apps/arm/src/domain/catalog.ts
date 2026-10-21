import { albums, artists, tracks } from '@mmusic/core/mocks';

/**
 * Read-only view of the app's demo catalog (public metadata from @mmusic/core) for ARM's artist pages. Only fields
 * the catalog itself states are shown — the catalog's own "verified" mark, genres, location, its tracks and
 * releases; no listener numbers, finances or moderation decisions are attached to catalog artists.
 */

export type CatalogArtist = {
  id: string;
  name: string;
  genres: string[];
  location?: string;
  verified: boolean;
  tracks: { id: string; title: string }[];
  releases: { id: string; title: string; type: 'album' | 'ep' | 'single'; year: number; trackCount: number }[];
};

/** Name of a catalog artist (for the demo submission built on a catalog track), or undefined. */
export function catalogArtistName(id: string): string | undefined {
  return artists.find((a) => a.id === id)?.name;
}

export function catalogArtists(): CatalogArtist[] {
  return artists.map((a) => ({
    id: a.id,
    name: a.name,
    genres: a.genres ?? [],
    location: a.location,
    verified: a.verified === true,
    tracks: tracks.filter((t) => t.artistId === a.id).map((t) => ({ id: t.id, title: t.title })),
    releases: albums.filter((al) => al.artistId === a.id).map((al) => ({ id: al.id, title: al.title, type: al.type, year: al.year, trackCount: al.trackCount })),
  }));
}
