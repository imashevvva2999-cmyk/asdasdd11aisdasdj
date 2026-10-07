import type { CurrentUser } from './types';

/**
 * Mock signed-in user for Profile Hub (S-23). No real authentication exists —
 * this is a fixed local object, not session state. "482 Saved" / "38
 * Playlists" have no live data source yet; "Supported" and its artist count
 * are deliberately NOT included here — docs/screens.md §S-22/S-23 notes a
 * documented discrepancy between a static mock number and the real donation
 * count, so Profile Hub computes those two from `useSupportStore.history`
 * instead of duplicating a second hardcoded figure.
 */
export const currentUser: CurrentUser = {
  name: 'Alex Rivera',
  username: 'alex.rivera',
  verified: false,
  memberSinceYear: 2023,
  savedCount: 482,
  playlistsCount: 38,
  topArtistId: 'solaris-echo',
  topGenre: 'Electronic',
  monthlyListeningHours: 42,
};
