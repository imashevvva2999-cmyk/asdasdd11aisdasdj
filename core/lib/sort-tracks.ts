import type { Track } from '../mocks';

export const TRACK_SORT_MODES = ['Default order', 'Title', 'Artist'] as const;
export type TrackSortMode = (typeof TRACK_SORT_MODES)[number];

/** Local sort for the Playlist / Liked Songs "Sort" buttons (frontend-only). */
export function sortTracks(list: Track[], mode: TrackSortMode): Track[] {
  if (mode === 'Title') return [...list].sort((a, b) => a.title.localeCompare(b.title));
  if (mode === 'Artist') return [...list].sort((a, b) => a.artistName.localeCompare(b.artistName));
  return list;
}

export function nextSortMode(mode: TrackSortMode): TrackSortMode {
  return TRACK_SORT_MODES[(TRACK_SORT_MODES.indexOf(mode) + 1) % TRACK_SORT_MODES.length];
}
