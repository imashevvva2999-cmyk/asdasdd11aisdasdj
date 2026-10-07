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
  coverUri?: string;
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
  coverUri?: string;
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
  photoUri?: string;
  savedCount: number;
  playlistsCount: number;
  topArtistId?: ArtistId;
  topGenre?: string;
  monthlyListeningHours?: number;
};
