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
  { path: 'search/index.html', mustContain: ['What do you want to listen to', 'RECENT SEARCHES', 'TRENDING SEARCHES', 'Browse All'], mustNotContain: ['PLACEHOLDER'], label: 'Search / Explore (S-03)' },
  { path: 'search/results.html', mustContain: ['Top Result', 'Songs'], mustNotContain: ['PLACEHOLDER'], label: 'Search Results (S-04)' },
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
  { path: 'player/queue.html', mustContain: ['Playback Queue', 'NOW PLAYING', 'PLAYING NEXT', 'Infinity Autoplay'], mustNotContain: ['PLACEHOLDER'], label: 'Playback Queue (S-17)' },
  // Still placeholders — later Фаза 4 batches.
  { path: 'create-playlist.html', mustContain: ['S-14'], label: 'Create Playlist (shared route)' },
  { path: 'track/[id].html', mustContain: [], label: 'Track deep-link redirect' },
  { path: 'sheets/add-to-playlist.html', mustContain: ['S-18'], label: 'Add to Playlist sheet' },
  { path: 'sheets/support.html', mustContain: ['S-19'], label: 'Support sheet' },
  { path: 'sheets/support-confirm.html', mustContain: ['S-20'], label: 'Support Confirm sheet' },
  { path: 'sheets/support-success.html', mustContain: ['S-21'], label: 'Support Success sheet' },
  { path: 'profile/index.html', mustContain: ['S-23'], label: 'Profile Hub' },
  { path: 'profile/settings.html', mustContain: ['S-24'], label: 'Settings' },
  { path: 'profile/support-history.html', mustContain: ['S-22'], label: 'Support History' },
  { path: 'profile/artist/become-artist.html', mustContain: ['S-25'], label: 'Become an Artist (UF-14)' },
  { path: 'profile/artist/setup.html', mustContain: ['S-26'], label: 'Artist Setup (UF-14)' },
  { path: 'profile/artist/dashboard.html', mustContain: ['S-27'], label: 'Artist Dashboard (UF-14)' },
  { path: 'profile/artist/upload-track.html', mustContain: ['S-28'], label: 'Upload Track (UF-14)' },
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
