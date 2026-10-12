#!/usr/bin/env node
/**
 * Post-processes `expo export --platform web` for the public website (W1 —
 * docs/superpowers/specs/2026-10-08-web-w1-w2.md):
 * - removes development-only pages (component gallery, route sitemap);
 * - adds 404.html (copy of +not-found.html), the name most static hosts use.
 *
 * Usage: node scripts/web-postexport.mjs [dir=dist]
 */
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DEV_ONLY_PAGES = ['dev-ui-kit.html', 'dev-living-moods.html', 'dev-demo-seed.html', '_sitemap.html'];

const dir = resolve(process.argv[2] ?? 'dist');
if (!existsSync(join(dir, 'index.html'))) {
  console.error(`No web export in ${dir}.`);
  process.exit(1);
}

for (const page of DEV_ONLY_PAGES) {
  const file = join(dir, page);
  if (existsSync(file)) {
    rmSync(file);
    console.log(`removed development page: ${page}`);
  }
}

const notFound = join(dir, '+not-found.html');
if (!existsSync(notFound)) {
  console.error('+not-found.html is missing from the export.');
  process.exit(1);
}
copyFileSync(notFound, join(dir, '404.html'));
console.log('added 404.html');
