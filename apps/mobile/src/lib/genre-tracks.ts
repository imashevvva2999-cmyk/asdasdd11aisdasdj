import { hasDemoAudio } from '@/audio/demo-audio';
import { artists, featuredGenre, genres, tracks, type TrackId } from '@/mocks';

/**
 * Maps catalog genre ids (the 12 "Browse All" categories) to the existing
 * Artist.genres free-text tags that belong to them. This is a locked,
 * user-approved mapping (see the plan's AMENDMENT section) — do not extend
 * or guess additional entries. A genre id with no entry here, or whose
 * mapped artists have no tracks, correctly has zero tracks.
 * `kyrgyz-music` was added with the user's explicit approval on 2026-10-12.
 */
export const GENRE_TAG_MAP: Record<string, string[]> = {
  'electronic-dance': ['Electronic'],
  'chill-lofi': ['Ambient', 'Lo-Fi'],
  'rock-indie': ['Indie'],
  'classical-film': ['Neo-Classical'],
  'kyrgyz-music': ['Kyrgyz Pop', 'Kyrgyz Rap', 'Kyrgyz Folk'],
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
 * Genres with at least one demo-audio track come first (catalog order kept
 * within each group), so Discover — which opens on index 0 — never opens on
 * a genre whose tracks are all still pending licensed audio.
 */
export function getPlayableGenreIds(): string[] {
  // featuredGenre (Kyrgyz Music) is a catalog genre too — it just isn't one
  // of the 12 numbered Browse All tiles.
  const withTracks = [featuredGenre, ...genres].map((g) => g.id).filter((id) => getTrackIdsForGenre(id).length > 0);
  const hasAudio = (id: string) => getTrackIdsForGenre(id).some((trackId) => hasDemoAudio(trackId));
  return [...withTracks.filter(hasAudio), ...withTracks.filter((id) => !hasAudio(id))];
}

/** Which playable genre (if any) a given track belongs to — used to pick the
 * right starting genre when the discovery player opens on a specific track
 * (e.g. from Home) that may or may not be tagged into the current mapping. */
export function getGenreIdForTrack(trackId: TrackId): string | undefined {
  return getPlayableGenreIds().find((id) => getTrackIdsForGenre(id).includes(trackId));
}
