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
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const root = join(import.meta.dirname, '..');
const distDir = join(root, 'dist');

/** @type {{ path: string; mustContain: string[]; mustNotContain?: string[]; label: string }[]} */
const expectations = [
  // Фаза 4, batch 1 — real screens, must NOT render the dev ScreenPlaceholder any more.
  { path: 'home/index.html', mustContain: ['For you', 'Trending Now', 'New Releases', 'Jump Back In', 'Vibe Mixes'], mustNotContain: ['PLACEHOLDER'], label: 'Home (S-01)' },
  { path: 'home/see-all.html', mustContain: ['This Week', 'Fresh Finds'], mustNotContain: ['PLACEHOLDER'], label: 'See All (S-02)' },
  { path: 'search/index.html', mustContain: ['What do you want to listen to', 'RECENT SEARCHES', 'Trending Searches', 'Browse All'], mustNotContain: ['PLACEHOLDER'], label: 'Search / Explore (S-03)' },
  // Query-parameter routes (#418): the static HTML cannot know `?q=` / `?id=`,
  // so it is a neutral shell — never another state's content ("Trending",
  // "Nothing to show.", "Artist not found.") that the client would replace.
  { path: 'search/results.html', mustContain: [], mustNotContain: ['PLACEHOLDER', 'No results for', 'Trending right now'], label: 'Search Results (S-04, neutral shell until ?q= is known)' },
  { path: 'sheets/options.html', mustContain: [], mustNotContain: ['PLACEHOLDER', 'Nothing to show.'], label: 'Track options (neutral shell until ?kind=&id= are known)' },
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
  { path: 'player/queue.html', mustContain: ['Lyrics', 'Queue', 'NOW PLAYING', 'Playing Next', 'Infinity Autoplay'], mustNotContain: ['PLACEHOLDER'], label: 'Playback Queue (S-17)' },
  // Фаза 4, batch 3 — real screens. support.html / support-confirm.html /
  // support-success.html receive no artistId/amount (query params, not route
  // segments — generateStaticParams doesn't apply) in a cold static export, so
  // they correctly render their real "nothing selected yet" fallback state
  // instead of the full designed flow; that fallback text is asserted here.
  // The full flow is exercised directly against the store in
  // scripts/verify-support-store.mjs instead.
  { path: 'create-playlist.html', mustContain: ['Create Playlist', 'Add Cover', 'Public Playlist', 'Collaborative'], mustNotContain: ['PLACEHOLDER'], label: 'Create Playlist (S-14)' },
  { path: 'track/[id].html', mustContain: [], label: 'Track deep-link redirect' },
  { path: 'sheets/add-to-playlist.html', mustContain: [], mustNotContain: ['PLACEHOLDER', 'Choose one or more destinations'], label: 'Add to Playlist (S-18, neutral shell until ?trackId= is known)' },
  { path: 'sheets/notifications.html', mustContain: ['Notifications', 'DEMO', 'New release'], mustNotContain: ['PLACEHOLDER'], label: 'Notifications (demo drawer)' },
  { path: 'sheets/demo-audio.html', mustContain: ['Demo audio', 'Chill Wave', 'Floating Cities', 'Kevin MacLeod', 'Creative Commons'], mustNotContain: ['PLACEHOLDER'], label: 'Demo audio credits (CC BY 4.0)' },
  { path: 'sheets/support.html', mustContain: [], mustNotContain: ['PLACEHOLDER', 'Artist not found.'], label: 'Support Artist (S-19, neutral shell until ?artistId= is known)' },
  { path: 'sheets/support-confirm.html', mustContain: ['Nothing to confirm'], mustNotContain: ['PLACEHOLDER'], label: 'Donation Confirmation (S-20, nothing to confirm yet)' },
  { path: 'sheets/support-success.html', mustContain: ['No recent support to show.'], mustNotContain: ['PLACEHOLDER'], label: 'Support Success (S-21, no recent donation yet)' },
  { path: 'profile/index.html', mustContain: ['Alex Rivers', 'Studio Sanctuary', 'Become an Artist', 'Supported', 'All Settings'], mustNotContain: ['PLACEHOLDER'], label: 'Profile Hub (S-23)' },
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
  // W1 — the website's own 404 page (served by the host for unknown URLs).
  { path: '+not-found.html', mustContain: ['Page not found', 'Go to Home'], mustNotContain: ['PLACEHOLDER'], label: '404 page (W1)' },
];

console.log('Running the production web build (expo export + post-export)…');
execSync('npx expo export --platform web', { cwd: root, stdio: 'inherit' });
execSync('node scripts/web-postexport.mjs dist', { cwd: root, stdio: 'inherit' });

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

// W1 — website basics on every page: metadata, safe areas (iPhone), manifest.
const HEAD_MARKERS = [' lang="en"', 'viewport-fit=cover', '<meta name="description"', '<meta name="theme-color"', 'rel="manifest"', 'property="og:title"'];
let headFailures = 0;
for (const { path } of expectations) {
  const filePath = join(distDir, path);
  if (!existsSync(filePath)) continue;
  const html = readFileSync(filePath, 'utf8');
  const missing = HEAD_MARKERS.filter((marker) => !html.includes(marker));
  const title = /<title[^>]*>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  if (missing.length > 0 || !title.includes('Mmusic')) {
    console.error(`✗ FAIL     website head — ${path}`);
    if (missing.length > 0) console.error(`    missing: ${missing.join(', ')}`);
    if (!title.includes('Mmusic')) console.error(`    title: "${title}"`);
    failures += 1;
    headFailures += 1;
  }
}
if (headFailures === 0) console.log('✓ OK       website head (metadata, viewport-fit, manifest, title) on every page');

// W1 — page titles follow the content.
const TITLES = [
  ['home/index.html', 'Mmusic'],
  ['search/index.html', 'Search – Mmusic'],
  ['library/index.html', 'Your Library – Mmusic'],
  ['artist/solaris-echo.html', 'Solaris Echo – Mmusic'],
  ['album/horizon-deluxe.html', 'Horizon (Deluxe) – Mmusic'],
  ['player/now-playing.html', 'Midnight Mirage by Solaris Echo – Mmusic'],
  ['+not-found.html', 'Page not found – Mmusic'],
];
for (const [path, expected] of TITLES) {
  const html = existsSync(join(distDir, path)) ? readFileSync(join(distDir, path), 'utf8') : '';
  const title = (/<title[^>]*>([^<]*)<\/title>/.exec(html)?.[1] ?? '').replace(/&amp;/g, '&');
  if (title === expected) {
    console.log(`✓ OK       title "${expected}"`);
  } else {
    console.error(`✗ FAIL     title for ${path}: expected "${expected}", got "${title}"`);
    failures += 1;
  }
}

// React #418 (hydration): icons must be drawn in the server-rendered HTML exactly
// as the client draws them. @expo/vector-icons renders an empty <Text> until its
// font counts as loaded, so the icon fonts have to load with the text fonts.
const require = createRequire(import.meta.url);
const glyphMap = JSON.parse(
  readFileSync(join(dirname(require.resolve('@expo/vector-icons/package.json')), 'build/vendor/react-native-vector-icons/glyphmaps/MaterialIcons.json'), 'utf8'),
);
const homeHtml = existsSync(join(distDir, 'home/index.html')) ? readFileSync(join(distDir, 'home/index.html'), 'utf8') : '';
const missingGlyphs = ['home', 'search', 'library-music'].filter((name) => !homeHtml.includes(String.fromCodePoint(glyphMap[name])));
if (missingGlyphs.length === 0) {
  console.log('✓ OK       tab bar icons are server-rendered (no hydration mismatch)');
} else {
  console.error(`✗ FAIL     icons missing from server HTML (React #418): ${missingGlyphs.join(', ')}`);
  failures += 1;
}

// W1 — development-only pages are not part of the public website.
for (const path of ['dev-ui-kit.html', '_sitemap.html']) {
  if (existsSync(join(distDir, path))) {
    console.error(`✗ FAIL     development page published: ${path}`);
    failures += 1;
  } else {
    console.log(`✓ OK       not published: ${path}`);
  }
}

// W1 — installable web app manifest with icons.
const manifestPath = join(distDir, 'manifest.webmanifest');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const iconsOk = manifest?.icons?.length >= 2 && manifest.icons.every((icon) => existsSync(join(distDir, icon.src.replace(/^\//, ''))));
if (manifest?.name === 'Mmusic' && manifest.display === 'standalone' && iconsOk) {
  console.log('✓ OK       web app manifest and icons');
} else {
  console.error('✗ FAIL     web app manifest missing or incomplete');
  failures += 1;
}

// #418 class B — every catalog id has its own pre-rendered page (needs this
// export's dist/, so it runs here, before the clean-up below).
try {
  execSync('npx tsx scripts/verify-static-pages.mjs', { cwd: root, stdio: 'inherit' });
} catch {
  console.error('✗ FAIL     catalog pages are not all pre-rendered (scripts/verify-static-pages.mjs)');
  failures += 1;
}

rmSync(distDir, { recursive: true, force: true });
rmSync(join(root, '.expo'), { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n${failures}/${expectations.length} route checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${expectations.length} route checks passed.`);
