#!/usr/bin/env node
/**
 * Every catalog page can be opened directly (React #418 fix, class B): each
 * artist, album, playlist and genre id is pre-rendered into its own HTML with
 * its own title — never the shared `[id].html` shell, whose static text
 * ("… not found") differs from what the browser then renders.
 *
 * Reads the `dist/` export produced by scripts/verify-routes.mjs, so it runs
 * after it in `pnpm test`. Usage: npx tsx scripts/verify-static-pages.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { albums, artists, featuredGenre, genres, playlists } from '../src/mocks/index.ts';

const dist = join(import.meta.dirname, '..', 'dist');

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

/** React's text escaping in static HTML. */
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

const families = [
  { route: 'artist', items: artists.map((a) => ({ id: a.id, title: a.name })) },
  { route: 'album', items: albums.map((a) => ({ id: a.id, title: a.title })) },
  { route: 'playlist', items: playlists.map((p) => ({ id: p.id, title: p.title })) },
  // The featured genre (Kyrgyz Music) is linked from Search and All Genres too.
  { route: 'search/genre', items: [featuredGenre, ...genres].map((g) => ({ id: g.id, title: g.title })) },
];

for (const { route, items } of families) {
  const missing = [];
  const wrong = [];
  for (const { id, title } of items) {
    const file = join(dist, route, `${id}.html`);
    if (!existsSync(file)) {
      missing.push(id);
      continue;
    }
    const html = readFileSync(file, 'utf8');
    if (!html.includes(escapeHtml(title)) || /not found/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) wrong.push(id);
  }
  check(`/${route}/[id]: all ${items.length} catalog ids pre-rendered`, missing.length === 0);
  if (missing.length > 0) console.error(`    missing: ${missing.join(', ')}`);
  check(`/${route}/[id]: each page shows its own title, never "not found"`, wrong.length === 0);
  if (wrong.length > 0) console.error(`    wrong content: ${wrong.join(', ')}`);
}

if (failures > 0) {
  console.error(`\n${failures} static-page check(s) failed.`);
  process.exit(1);
}
console.log('\nAll static-page checks passed.');
