import { type LocalOrRemoteImage, resolveArtwork, stitchArtworkByForYouTileId } from '@/constants/stitch-artwork';

import { albums } from './albums';
import { playlists } from './playlists';
import { tracks } from './tracks';

/** "For you" quick-tile grid — 6 recently played items (docs/screens.md §3.1 S-01).
 * Covers recovered from the Stitch export (Фаза 4 restoration pass). These
 * are mixes with no screen of their own, so each carries a small local
 * tracklist drawn from the existing catalog for its tap/▶ to play; the
 * "Solaris Echo" radio tile also links to the artist (`artistId`). */
export const forYouTiles: { id: string; title: string; coverUri?: LocalOrRemoteImage; trackIds: string[]; artistId?: string }[] = [
  {
    id: 'after-hours',
    title: 'After Hours',
    coverUri: resolveArtwork(stitchArtworkByForYouTileId['after-hours']),
    trackIds: ['midnight-mirage', 'velvet-skyline-t1', 'nebula-dreams-t1', 'ember-tide'],
  },
  {
    id: 'synthetic-waves',
    title: 'Synthetic Waves',
    coverUri: resolveArtwork(stitchArtworkByForYouTileId['synthetic-waves']),
    trackIds: ['velvet-skyline-t1', 'chronos-echoes-t1', 'vapor-trails', 'obsidian-frequencies'],
  },
  {
    id: 'deep-focus',
    title: 'Deep Focus',
    coverUri: resolveArtwork(stitchArtworkByForYouTileId['deep-focus']),
    trackIds: ['lost-frequencies-t1', 'resonant-field-reprise', 'abyssal-bloom', 'horizon'],
  },
  {
    id: 'solaris-echo-radio',
    title: 'Solaris Echo',
    coverUri: resolveArtwork(stitchArtworkByForYouTileId['solaris-echo-radio']),
    trackIds: ['midnight-mirage', 'horizon', 'obsidian-frequencies', 'ember-tide', 'resonant-field-reprise'],
    artistId: 'solaris-echo',
  },
  {
    id: 'chill-electronic',
    title: 'Chill Electronic',
    coverUri: resolveArtwork(stitchArtworkByForYouTileId['chill-electronic']),
    trackIds: ['nebula-dreams-t1', 'tape-saturation-4', 'horizon', 'lost-frequencies-t1'],
  },
  {
    id: 'neo-soul',
    title: 'Neo Soul',
    coverUri: resolveArtwork(stitchArtworkByForYouTileId['neo-soul']),
    trackIds: ['vapor-trails', 'abyssal-bloom-feat', 'ember-tide', 'velvet-skyline-t1'],
  },
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
