/**
 * The ⋯ menu of a Home "For you" tile. A tile is a mix (a list of tracks,
 * sometimes an artist's), not a single track or a saved playlist, so only the
 * actions the app supports for a mix are offered: play it, shuffle it, and —
 * for an artist's mix — open the artist. (Add to playlist works on one track;
 * adding a whole mix does not exist, so it is not offered here.)
 */
export type ForYouMenuAction = 'play' | 'shuffle' | 'view-artist';

export function forYouMenuActions(tile: { trackIds: string[]; artistId?: string }): ForYouMenuAction[] {
  if (tile.trackIds.length === 0) return [];
  return tile.artistId ? ['play', 'shuffle', 'view-artist'] : ['play', 'shuffle'];
}
