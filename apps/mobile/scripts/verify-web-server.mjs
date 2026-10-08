#!/usr/bin/env node
/**
 * Tests for the production web server rules (W1 — docs/superpowers/specs/
 * 2026-10-08-web-w1-w2.md): clean URLs and deep links into a static Expo
 * export, dynamic routes, 404, HTTP Range for audio (Safari needs 206), cache
 * and security headers, path traversal. Uses a small fixture laid out like
 * `expo export --platform web` output.
 *
 * Usage: node scripts/verify-web-server.mjs
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { createWebServer } from './serve-web.mjs';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const root = mkdtempSync(join(tmpdir(), 'mmusic-web-'));
const AUDIO = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));
const files = {
  'index.html': 'ROOT',
  'home/index.html': 'HOME',
  '(tabs)/home/index.html': 'GROUP-HOME',
  'player/now-playing.html': 'NOW-PLAYING',
  'artist/[id].html': 'ARTIST-TEMPLATE',
  'artist/solaris-echo.html': 'SOLARIS',
  'search/genre/[id].html': 'GENRE-TEMPLATE',
  '+not-found.html': 'NOT-FOUND',
  'manifest.webmanifest': '{}',
  '_expo/static/js/web/entry-abc123.js': 'JS',
  'assets/assets/audio/chill-wave.3984ae8a.mp3': AUDIO,
};
for (const [path, body] of Object.entries(files)) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), body);
}
writeFileSync(join(dirname(root), 'secret.txt'), 'SECRET');

const server = createWebServer({ root });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const get = (path, init) => fetch(base + path, init);
const text = async (path, init) => (await get(path, init)).text();

try {
  // Routing: clean URLs, deep links, refresh on any screen.
  check('/ serves the app entry', (await text('/')) === 'ROOT');
  check('/home serves home/index.html', (await text('/home')) === 'HOME');
  check('/player/now-playing (refresh/deep link) serves its page', (await text('/player/now-playing')) === 'NOW-PLAYING');
  check('a prerendered dynamic page wins over the template', (await text('/artist/solaris-echo')) === 'SOLARIS');
  check('an unknown id falls back to the [id] template (200)', (await get('/artist/new-artist')).status === 200 && (await text('/artist/new-artist')) === 'ARTIST-TEMPLATE');
  check('nested dynamic route /search/genre/:id', (await text('/search/genre/jazz')) === 'GENRE-TEMPLATE');
  check('query strings are ignored for routing', (await text('/player/now-playing?trackId=horizon')) === 'NOW-PLAYING');
  const missing = await get('/no-such-page');
  check('an unknown path → 404 with the not-found page', missing.status === 404 && (await missing.text()) === 'NOT-FOUND');
  check('the template file itself is not a public URL', (await get('/artist/%5Bid%5D')).status === 404);
  check('route-group folders are not public URLs', (await get('/(tabs)/home')).status === 404);

  // Security.
  check('path traversal is refused', (await get('/../secret.txt')).status === 404 && (await get('/%2e%2e/secret.txt')).status === 404);
  const home = await get('/home');
  check('HTML is not cached long', home.headers.get('cache-control') === 'no-cache');
  check('security headers on every response', home.headers.get('x-content-type-options') === 'nosniff' && home.headers.get('referrer-policy') === 'strict-origin-when-cross-origin' && /frame-ancestors 'none'/.test(home.headers.get('content-security-policy') ?? ''));
  check('only GET and HEAD are allowed', (await get('/home', { method: 'POST' })).status === 405);

  // Static assets.
  const js = await get('/_expo/static/js/web/entry-abc123.js');
  check('hashed bundles are cached for a year (immutable)', /immutable/.test(js.headers.get('cache-control') ?? '') && /javascript/.test(js.headers.get('content-type') ?? ''));
  check('the web manifest has its media type', /application\/manifest\+json/.test((await get('/manifest.webmanifest')).headers.get('content-type') ?? ''));

  // Audio: HTTP Range (Safari requires 206 to play and seek).
  const audioPath = '/assets/assets/audio/chill-wave.3984ae8a.mp3';
  const head = await get(audioPath, { method: 'HEAD' });
  check('audio advertises byte ranges', head.status === 200 && head.headers.get('accept-ranges') === 'bytes' && head.headers.get('content-length') === '1000' && head.headers.get('content-type') === 'audio/mpeg');
  const first = await get(audioPath, { headers: { Range: 'bytes=0-99' } });
  const firstBytes = Buffer.from(await first.arrayBuffer());
  check('Range bytes=0-99 → 206 with the first 100 bytes', first.status === 206 && first.headers.get('content-range') === 'bytes 0-99/1000' && firstBytes.length === 100 && firstBytes.equals(AUDIO.subarray(0, 100)));
  const tail = await get(audioPath, { headers: { Range: 'bytes=900-' } });
  check('Range bytes=900- → the last 100 bytes', tail.status === 206 && tail.headers.get('content-range') === 'bytes 900-999/1000' && Buffer.from(await tail.arrayBuffer()).equals(AUDIO.subarray(900)));
  const suffix = await get(audioPath, { headers: { Range: 'bytes=-10' } });
  check('Range bytes=-10 → the last 10 bytes', suffix.status === 206 && suffix.headers.get('content-range') === 'bytes 990-999/1000');
  const clamp = await get(audioPath, { headers: { Range: 'bytes=990-5000' } });
  check('a range past the end is clamped to the file', clamp.status === 206 && clamp.headers.get('content-range') === 'bytes 990-999/1000');
  const outside = await get(audioPath, { headers: { Range: 'bytes=2000-3000' } });
  check('an unsatisfiable range → 416', outside.status === 416 && outside.headers.get('content-range') === 'bytes */1000');
  const full = await get(audioPath);
  check('no Range → the whole file (200)', full.status === 200 && Buffer.from(await full.arrayBuffer()).length === 1000);
} finally {
  server.close();
  rmSync(root, { recursive: true, force: true });
  rmSync(join(dirname(root), 'secret.txt'), { force: true });
}

if (failures > 0) {
  console.error(`\n${failures} web-server check(s) failed.`);
  process.exit(1);
}
console.log('\nAll web-server checks passed.');
