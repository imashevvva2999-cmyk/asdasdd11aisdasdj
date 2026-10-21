import { demoAudioKeys, PENDING_AUDIO_TRACK_IDS } from '@mmusic/core/audio/demo-audio-keys';
import { albums, artists, genres, playlists, tracks } from '@mmusic/core/mocks';

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

/** demo = the app plays a licensed demo recording for it; pending = licensed audio awaited; none = no audio file. */
export type DemoAudioState = 'demo' | 'pending' | 'none';

export type CatalogTrackRow = { id: string; title: string; artistId: string; artistName: string; albumTitle?: string; durationSec?: number; explicit: boolean; lossless: boolean; audio: DemoAudioState };
export type CatalogAlbumRow = { id: string; title: string; artistId: string; artistName: string; type: 'album' | 'ep' | 'single'; year: number; trackCount: number };
export type CatalogPlaylistRow = { id: string; title: string; curator?: string; editorial: boolean; trackCount: number };
export type CatalogGenreRow = { id: string; title: string; subtitle?: string };

/** Catalog tracks (read-only public metadata) with the demo-audio state the app itself declares. */
export function catalogTrackRows(): CatalogTrackRow[] {
  return tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artistId: t.artistId,
    artistName: t.artistName,
    albumTitle: albums.find((a) => a.id === t.albumId)?.title,
    durationSec: t.durationSec,
    explicit: t.explicit === true,
    lossless: t.lossless === true,
    audio: demoAudioKeys[t.id] ? 'demo' : PENDING_AUDIO_TRACK_IDS.includes(t.id) ? 'pending' : 'none',
  }));
}

export function catalogAlbumRows(): CatalogAlbumRow[] {
  return albums.map((a) => ({ id: a.id, title: a.title, artistId: a.artistId, artistName: a.artistName, type: a.type, year: a.year, trackCount: a.trackIds?.length ?? a.trackCount }));
}

export function catalogPlaylistRows(): CatalogPlaylistRow[] {
  return playlists.map((p) => ({ id: p.id, title: p.title, curator: p.curator, editorial: p.editorial === true, trackCount: p.trackIds?.length ?? p.trackCount }));
}

export function catalogGenreRows(): CatalogGenreRow[] {
  return genres.map((g) => ({ id: g.id, title: g.title, subtitle: g.subtitle }));
}

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
