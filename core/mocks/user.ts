import type { CurrentUser } from './types';

/**
 * Mock signed-in user for Profile Hub (S-23). No real authentication exists —
 * this is a fixed local object, not session state. Name/handle/verified/
 * topGenre corrected to match the FINAL approved profile_hub_mmusic Stitch
 * export exactly (Фаза 4 fidelity pass) — it reads "Alex Rivers" /
 * "@alexrivers" with a verified mark and Top Genre "Modular Synth", not the
 * earlier "Alex Rivera" / "@alex.rivera" / "Electronic" approximation.
 * "482 Saved" / "38 Playlists" already matched Stitch exactly. "Supported"
 * and its artist count are deliberately NOT included here —
 * docs/screens.md §S-22/S-23 notes a documented discrepancy between a
 * static mock number and the real donation count, so Profile Hub computes
 * those two from `useSupportStore.history` instead of duplicating a second
 * hardcoded figure. No real Alex Rivers avatar photo exists in the Stitch
 * export (its own `<img>` already falls back to Stitch's own broken-image
 * placeholder SVG) — `photoUri` stays unset; see the Фаза 4 report.
 */
export const currentUser: CurrentUser = {
  name: 'Alex Rivers',
  username: 'alexrivers',
  verified: true,
  memberSinceYear: 2023,
  savedCount: 482,
  playlistsCount: 38,
  topArtistId: 'solaris-echo',
  topGenre: 'Modular Synth',
  monthlyListeningHours: 42,
};
