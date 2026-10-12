import { artists, genres, tracks, type TrackId } from '@/mocks';

/**
 * Maps catalog genre ids (the 12 "Browse All" categories) to the existing
 * Artist.genres free-text tags that belong to them. This is a locked,
 * user-approved mapping (see the plan's AMENDMENT section) — do not extend
 * or guess additional entries. A genre id with no entry here, or whose
 * mapped artists have no tracks, correctly has zero tracks.
 */
export const GENRE_TAG_MAP: Record<string, string[]> = {
  'electronic-dance': ['Electronic'],
  'chill-lofi': ['Ambient', 'Lo-Fi'],
  'rock-indie': ['Indie'],
  'classical-film': ['Neo-Classical'],
};

export function getTrackIdsForGenre(genreId: string): TrackId[] {
  const tags = GENRE_TAG_MAP[genreId];
  if (!tags || tags.length === 0) return [];
  const artistIds = new Set(artists.filter((a) => a.genres?.some((g) => tags.includes(g))).map((a) => a.id));
  return tracks.filter((t) => artistIds.has(t.artistId)).map((t) => t.id);
}

/**
 * The discovery player's horizontal genre list, per the user's explicit
 * follow-up constraint: only genres with at least one real track are
 * reachable by horizontal swipe — do not show empty genres in that
 * sequence. The full 12-genre catalog (Browse All / genre-detail screens)
 * is untouched and keeps showing all 12 regardless of this filter.
 */
export function getPlayableGenreIds(): string[] {
  return genres.map((g) => g.id).filter((id) => getTrackIdsForGenre(id).length > 0);
}

/** Which playable genre (if any) a given track belongs to — used to pick the
 * right starting genre when the discovery player opens on a specific track
 * (e.g. from Home) that may or may not be tagged into the current mapping. */
export function getGenreIdForTrack(trackId: TrackId): string | undefined {
  return getPlayableGenreIds().find((id) => getTrackIdsForGenre(id).includes(trackId));
}
