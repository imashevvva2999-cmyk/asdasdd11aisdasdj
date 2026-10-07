import { resolveArtwork, stitchArtworkByForYouTileId } from '@/constants/stitch-artwork';

import { albums } from './albums';
import { playlists } from './playlists';
import { tracks } from './tracks';

/** "For you" quick-tile grid — 6 recently played items (docs/screens.md §3.1 S-01).
 * Covers recovered from the Stitch export (Фаза 4 restoration pass). */
export const forYouTiles = [
  { id: 'after-hours', title: 'After Hours', coverUri: resolveArtwork(stitchArtworkByForYouTileId['after-hours']) },
  { id: 'synthetic-waves', title: 'Synthetic Waves', coverUri: resolveArtwork(stitchArtworkByForYouTileId['synthetic-waves']) },
  { id: 'deep-focus', title: 'Deep Focus', coverUri: resolveArtwork(stitchArtworkByForYouTileId['deep-focus']) },
  { id: 'solaris-echo-radio', title: 'Solaris Echo', coverUri: resolveArtwork(stitchArtworkByForYouTileId['solaris-echo-radio']) },
  { id: 'chill-electronic', title: 'Chill Electronic', coverUri: resolveArtwork(stitchArtworkByForYouTileId['chill-electronic']) },
  { id: 'neo-soul', title: 'Neo Soul', coverUri: resolveArtwork(stitchArtworkByForYouTileId['neo-soul']) },
];

/** Hero spotlight banner — reuses the Late Night Flow editorial playlist. */
export const heroPlaylistId = playlists[0].id;

/** Trending Now carousel — album references. */
export const trendingNowAlbumIds = albums.slice(0, 4).map((album) => album.id);

/** New Releases carousel — album references with a release-state label. */
export const newReleases = [
  { albumId: 'refraction-horizon', label: 'Single • Out Today' },
  { albumId: 'resonant-field', label: 'EP • 5 Tracks' },
  { albumId: 'solitary-echo', label: 'Album • 11 Tracks' },
];

/** Jump Back In — recently played tracks, first one marked as currently playing. */
export const jumpBackInTrackIds = tracks.slice(0, 4).map((track) => track.id);
