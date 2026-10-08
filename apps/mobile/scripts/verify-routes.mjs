#!/usr/bin/env node
/**
 * Фаза 3 navigation smoke test — practical substitute for a full Jest/RNTL setup
 * in this environment (no iOS/Android simulator available). Runs a real
 * `expo export --platform web` (actually bundles + statically renders every
 * route) and asserts: the expected route files exist, contain their expected
 * content marker, and leak no "undefined" into the rendered output.
 *
 * Usage: node scripts/verify-routes.mjs (or `pnpm run verify:routes`)
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const distDir = join(root, 'dist');

/** @type {{ path: string; mustContain: string[]; mustNotContain?: string[]; label: string }[]} */
const expectations = [
  // Фаза 4, batch 1 — real screens, must NOT render the dev ScreenPlaceholder any more.
  { path: 'home/index.html', mustContain: ['For you', 'Trending Now', 'New Releases', 'Jump Back In', 'Vibe Mixes'], mustNotContain: ['PLACEHOLDER'], label: 'Home (S-01)' },
  { path: 'home/see-all.html', mustContain: ['This Week', 'Fresh Finds'], mustNotContain: ['PLACEHOLDER'], label: 'See All (S-02)' },
  { path: 'search/index.html', mustContain: ['What do you want to listen to', 'RECENT SEARCHES', 'Trending Searches', 'Browse All'], mustNotContain: ['PLACEHOLDER'], label: 'Search / Explore (S-03)' },
  { path: 'search/results.html', mustContain: ['Search Mmusic', 'Trending right now'], mustNotContain: ['PLACEHOLDER', 'No results for'], label: 'Search Results (S-04)' },
  { path: 'search/all-genres.html', mustContain: ['Explore 24+ sonic realms', 'Curated Realms'], mustNotContain: ['PLACEHOLDER'], label: 'All Genres & Moods (S-06)' },
  { path: 'search/genre/[id].html', mustContain: ['Essential Compilations', 'Pioneering Artists'], mustNotContain: ['PLACEHOLDER'], label: 'Genre detail (S-07)' },
  { path: 'library/index.html', mustContain: ['Your Library', 'Liked Songs'], mustNotContain: ['PLACEHOLDER'], label: 'Library (S-12)' },
  // Фаза 4, batch 2 — real screens. Dynamic routes use `generateStaticParams` to
  // pre-render one real id (artist/solaris-echo, album/horizon-deluxe,
  // playlist/late-night-flow) so the static export has real content to assert on;
  // the paramless `[id].html` fallback still exists and correctly renders a
  // "not found" state, which is not asserted here.
  { path: 'artist/solaris-echo.html', mustContain: ['Solaris Echo', 'Popular', 'Releases', 'Fans Also Like', 'About'], mustNotContain: ['PLACEHOLDER'], label: 'Artist Profile (S-08)' },
  { path: 'album/horizon-deluxe.html', mustContain: ['Horizon (Deluxe)', 'Solaris Echo'], mustNotContain: ['PLACEHOLDER'], label: 'Album (S-09)' },
  { path: 'playlist/late-night-flow.html', mustContain: ['Late Night Flow', 'Editorial Playlist', 'Slow-burning'], mustNotContain: ['PLACEHOLDER'], label: 'Playlist (S-10/S-11)' },
  { path: 'library/liked-songs.html', mustContain: ['Liked Songs', 'Auto Playlist', 'saved tracks'], mustNotContain: ['PLACEHOLDER'], label: 'Liked Songs (S-13)' },
  { path: 'player/now-playing.html', mustContain: ['PLAYING FROM ALBUM', 'Lyrics', 'Queue', 'Support', 'Audio'], mustNotContain: ['PLACEHOLDER'], label: 'Now Playing (S-15)' },
  { path: 'player/lyrics.html', mustContain: ['Midnight Mirage', 'Solaris Echo', 'Lyrics'], mustNotContain: ['PLACEHOLDER'], label: 'Synchronized Lyrics (S-16)' },
  { path: 'player/queue.html', mustContain: ['Playback Queue', 'NOW PLAYING', 'Playing Next', 'Infinity Autoplay'], mustNotContain: ['PLACEHOLDER'], label: 'Playback Queue (S-17)' },
  // Фаза 4, batch 3 — real screens. support.html / support-confirm.html /
  // support-success.html receive no artistId/amount (query params, not route
  // segments — generateStaticParams doesn't apply) in a cold static export, so
  // they correctly render their real "nothing selected yet" fallback state
  // instead of the full designed flow; that fallback text is asserted here.
  // The full flow is exercised directly against the store in
  // scripts/verify-support-store.mjs instead.
  { path: 'create-playlist.html', mustContain: ['Create Playlist', 'Add Cover', 'Public Playlist', 'Collaborative'], mustNotContain: ['PLACEHOLDER'], label: 'Create Playlist (S-14)' },
  { path: 'track/[id].html', mustContain: [], label: 'Track deep-link redirect' },
  { path: 'sheets/add-to-playlist.html', mustContain: ['Add to Playlist', 'Choose one or more destinations', 'New Playlist', 'Late Night Flow'], mustNotContain: ['PLACEHOLDER'], label: 'Add to Playlist (S-18)' },
  { path: 'sheets/notifications.html', mustContain: ['Notifications', 'DEMO', 'New release'], mustNotContain: ['PLACEHOLDER'], label: 'Notifications (demo drawer)' },
  { path: 'sheets/demo-audio.html', mustContain: ['Demo audio', 'Chill Wave', 'Floating Cities', 'Kevin MacLeod', 'Creative Commons'], mustNotContain: ['PLACEHOLDER'], label: 'Demo audio credits (CC BY 4.0)' },
  { path: 'sheets/support.html', mustContain: ['Artist not found.'], mustNotContain: ['PLACEHOLDER'], label: 'Support Artist (S-19, no artist selected yet)' },
  { path: 'sheets/support-confirm.html', mustContain: ['Nothing to confirm'], mustNotContain: ['PLACEHOLDER'], label: 'Donation Confirmation (S-20, nothing to confirm yet)' },
  { path: 'sheets/support-success.html', mustContain: ['No recent support to show.'], mustNotContain: ['PLACEHOLDER'], label: 'Support Success (S-21, no recent donation yet)' },
  { path: 'profile/index.html', mustContain: ['Alex Rivers', 'Studio Sanctuary', 'Become an Artist', 'Supported'], mustNotContain: ['PLACEHOLDER'], label: 'Profile Hub (S-23)' },
  { path: 'profile/settings.html', mustContain: ['Audio Streaming', 'Downloads &amp; Storage', 'Playback &amp; Sound Engine', 'Account &amp; Payments'], mustNotContain: ['PLACEHOLDER'], label: 'Settings (S-24)' },
  { path: 'profile/audio-quality.html', mustContain: ['Audio Streaming', 'Playback &amp; Sound Engine'], mustNotContain: ['PLACEHOLDER', 'Downloads &amp; Storage', 'Account &amp; Payments'], label: 'Audio Quality & Playback (S-23 destination)' },
  { path: 'profile/downloads.html', mustContain: ['Downloads &amp; Storage', 'Downloaded Music'], mustNotContain: ['PLACEHOLDER', 'Audio Streaming', 'Account &amp; Payments'], label: 'Downloads & Offline (S-23 destination)' },
  { path: 'profile/account.html', mustContain: ['MBANK Connected ID', 'Account &amp; Payments', 'Log Out'], mustNotContain: ['PLACEHOLDER', 'Audio Streaming', 'Downloads &amp; Storage'], label: 'Account & Security (S-23 destination)' },
  { path: 'profile/support-history.html', mustContain: ['Support History', 'Total Supported', 'MBANK Direct Creator Network'], mustNotContain: ['PLACEHOLDER'], label: 'Support History (S-22)' },
  // Фаза 4, batch 4 — real screens (Artist Flow, UF-14). Dashboard renders
  // its real "no artist profile yet" empty state in a cold static export
  // (useArtistStore.artist starts undefined with no setup completed in this
  // session) — the full create-profile → dashboard → upload → publish flow
  // is exercised directly against the store in scripts/verify-artist-store.mjs.
  { path: 'profile/artist/become-artist.html', mustContain: ['Share Your Sound with the World', 'Share Your Music', 'Fan Support', 'Artist Insights', 'BECOME AN ARTIST'], mustNotContain: ['PLACEHOLDER'], label: 'Become an Artist (S-25)' },
  { path: 'profile/artist/setup.html', mustContain: ['Primary Genre', 'Electronic', 'Create Artist Profile'], mustNotContain: ['PLACEHOLDER'], label: 'Artist Setup (S-26)' },
  { path: 'profile/artist/dashboard.html', mustContain: ['No artist profile yet', 'Set up your artist profile to start uploading tracks.'], mustNotContain: ['PLACEHOLDER'], label: 'Artist Dashboard (S-27, no local artist yet)' },
  { path: 'profile/artist/upload-track.html', mustContain: ['Upload Audio', 'Browse File', 'Track Details', 'Cover Artwork', 'Release Settings', 'Publish Track', 'Save as Draft'], mustNotContain: ['PLACEHOLDER'], label: 'Upload Track (S-28)' },
  { path: 'dev-ui-kit.html', mustContain: ['Play All'], label: 'Фаза 2 UI kit gallery (regression check)' },
];

console.log('Running `expo export --platform web`…');
execSync('npx expo export --platform web', { cwd: root, stdio: 'inherit' });

let failures = 0;

for (const { path, mustContain, mustNotContain = [], label } of expectations) {
  const filePath = join(distDir, path);
  if (!existsSync(filePath)) {
    console.error(`✗ MISSING  ${label} — ${path}`);
    failures += 1;
    continue;
  }

  const html = readFileSync(filePath, 'utf8');
  const leakedUndefined = (html.match(/undefined/g) ?? []).length;
  const missingMarkers = mustContain.filter((marker) => !html.includes(marker));
  const forbiddenMarkers = mustNotContain.filter((marker) => html.includes(marker));

  if (leakedUndefined > 0 || missingMarkers.length > 0 || forbiddenMarkers.length > 0) {
    console.error(`✗ FAIL     ${label} — ${path}`);
    if (leakedUndefined > 0) console.error(`    leaked "undefined" ${leakedUndefined}x`);
    if (missingMarkers.length > 0) console.error(`    missing content: ${missingMarkers.join(', ')}`);
    if (forbiddenMarkers.length > 0) console.error(`    contains forbidden content: ${forbiddenMarkers.join(', ')}`);
    failures += 1;
  } else {
    console.log(`✓ OK       ${label}`);
  }
}

rmSync(distDir, { recursive: true, force: true });
rmSync(join(root, '.expo'), { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n${failures}/${expectations.length} route checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${expectations.length} route checks passed.`);
