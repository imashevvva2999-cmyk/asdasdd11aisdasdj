/**
 * Frontend mock-data entity shapes (Фаза 4 — docs/development-plan.md, Frontend-only
 * milestone). These mirror the real catalog entities from architecture.md §6
 * (Track/Artist/Album/Playlist/Genre) closely enough that swapping the mock
 * fetchers in this folder for real API calls later shouldn't require changing
 * screen components — only this folder's internals.
 *
 * `coverUri`/`photoUri` are `LocalOrRemoteImage` (src/constants/stitch-artwork.ts):
 * a `string` is a remote URL (none currently used — see docs/screens.md §0 on
 * why Stitch's own temporary Google-hosted preview URLs are never hot-linked),
 * a `number` or `{ uri, width, height }` object is whatever a local bundled
 * asset's `require()` resolves to on the current platform (Фаза 4 artwork
 * restoration pass). Where an entity has neither (no recovered Stitch asset
 * exists for it), components fall back to a deterministic gradient
 * placeholder (src/constants/fallback-artwork.ts) instead of a flat grey box
 * — never generated/invented artwork.
 */
import type { LocalOrRemoteImage } from '@/constants/stitch-artwork';

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
  /** Undefined = length unknown (no audio file yet) — never a placeholder. */
  durationSec?: number;
  coverUri?: LocalOrRemoteImage;
  explicit?: boolean;
  lossless?: boolean;
};

export type Artist = {
  id: ArtistId;
  name: string;
  verified?: boolean;
  monthlyListeners?: number;
  photoUri?: LocalOrRemoteImage;
  genres?: string[];
  bio?: string;
  location?: string;
  /** Track IDs for the "Popular" section (docs/screens.md §3.3 S-08). */
  popularTrackIds?: TrackId[];
  /** Album IDs for the "Releases" section. */
  releaseAlbumIds?: AlbumId[];
  /** Artist IDs for "Fans Also Like". */
  fansAlsoLikeIds?: ArtistId[];
};

export type Album = {
  id: AlbumId;
  title: string;
  artistId: ArtistId;
  artistName: string;
  type: 'album' | 'ep' | 'single';
  year: number;
  trackCount: number;
  coverUri?: LocalOrRemoteImage;
  /** Real track references for the album's listing — falls back to `trackCount`
   * (no detailed listing) when omitted, rather than inventing filler rows. */
  trackIds?: TrackId[];
};

export type Playlist = {
  id: PlaylistId;
  title: string;
  description?: string;
  curator?: string;
  editorial?: boolean;
  trackCount: number;
  durationLabel?: string;
  coverUri?: LocalOrRemoteImage;
  /** Real track references — same policy as Album.trackIds. */
  trackIds?: TrackId[];
  /** "Updated 2h ago" style label for the Add to Playlist picker (docs/screens.md §3.7 S-18). */
  updatedLabel?: string;
  /** Public/Collaborative toggles from Create Playlist (S-14) — local state only. */
  isPublic?: boolean;
  isCollaborative?: boolean;
};

export type Genre = {
  id: GenreId;
  title: string;
  subtitle?: string;
  number?: number;
  coverUri?: LocalOrRemoteImage;
};

export type MoodMix = {
  id: string;
  title: string;
  subtitle: string;
  trackCount: number;
  icon: string;
  tint: 'primary' | 'tertiary' | 'secondary';
  /** Local sample of what tapping the mix plays (the full mix is a backend
   * recommendation concern — `trackCount` is the designed display figure). */
  trackIds: TrackId[];
};

export type LibraryItemKind = 'playlist' | 'artist' | 'album';

export type LibraryItem = {
  id: string;
  kind: LibraryItemKind;
  refId: string;
  downloaded?: boolean;
  addedAt: string;
};

/**
 * A completed local donation (Фаза 4, Batch 3 — docs/screens.md §3.12 S-19…S-22).
 * `status` is only ever `'completed'` here: Pending/Failed/Refunded are documented
 * as undesigned, open states (OQ-16) and are not simulated. No real MBANK
 * transaction occurs — this records the local UI flow's outcome only.
 */
export type SupportHistoryEntry = {
  id: string;
  artistId: ArtistId;
  amount: number;
  currency: 'KGS';
  status: 'completed';
  createdAt: string;
};

/** Current (mock, local-only) signed-in user for Profile Hub (S-23). No real auth. */
export type CurrentUser = {
  name: string;
  username: string;
  verified?: boolean;
  memberSinceYear: number;
  photoUri?: LocalOrRemoteImage;
  savedCount: number;
  playlistsCount: number;
  topArtistId?: ArtistId;
  topGenre?: string;
  monthlyListeningHours?: number;
};
