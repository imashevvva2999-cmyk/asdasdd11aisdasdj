/**
 * Frontend mock-data entity shapes (Фаза 4 — docs/development-plan.md, Frontend-only
 * milestone). These mirror the real catalog entities from architecture.md §6
 * (Track/Artist/Album/Playlist/Genre) closely enough that swapping the mock
 * fetchers in this folder for real API calls later shouldn't require changing
 * screen components — only this folder's internals.
 *
 * `coverUri`/`photoUri` are intentionally left `undefined` everywhere in the mock
 * data: the Stitch exports only ever reference temporary Google-hosted preview
 * images (see docs/screens.md §0 — "в продукте не используются"), so hot-linking
 * them would misrepresent placeholder content as final artwork. Components fall
 * back to a plain surface-colored box when no URI is given — a clearly-identified
 * placeholder, not generated artwork. Replace with real asset URIs per entity
 * once a catalog exists.
 */

export type TrackId = string;
export type ArtistId = string;
export type AlbumId = string;
export type PlaylistId = string;
export type GenreId = string;

export type Track = {
  id: TrackId;
  title: string;
  artistId: ArtistId;
  artistName: string;
  albumId?: AlbumId;
  durationSec: number;
  coverUri?: string;
  explicit?: boolean;
  lossless?: boolean;
};

export type Artist = {
  id: ArtistId;
  name: string;
  verified?: boolean;
  monthlyListeners?: number;
  photoUri?: string;
  genres?: string[];
};

export type Album = {
  id: AlbumId;
  title: string;
  artistId: ArtistId;
  artistName: string;
  type: 'album' | 'ep' | 'single';
  year: number;
  trackCount: number;
  coverUri?: string;
};

export type Playlist = {
  id: PlaylistId;
  title: string;
  curator?: string;
  editorial?: boolean;
  trackCount: number;
  durationLabel?: string;
  coverUri?: string;
};

export type Genre = {
  id: GenreId;
  title: string;
  subtitle?: string;
  number?: number;
  coverUri?: string;
};

export type MoodMix = {
  id: string;
  title: string;
  subtitle: string;
  trackCount: number;
  icon: string;
  tint: 'primary' | 'tertiary' | 'secondary';
};

export type LibraryItemKind = 'playlist' | 'artist' | 'album';

export type LibraryItem = {
  id: string;
  kind: LibraryItemKind;
  refId: string;
  downloaded?: boolean;
  addedAt: string;
};
