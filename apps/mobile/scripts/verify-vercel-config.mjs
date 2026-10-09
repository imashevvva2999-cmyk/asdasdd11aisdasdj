#!/usr/bin/env node
/**
 * vercel.json for the public website (static Expo export) reproduces the
 * reference host rules of scripts/serve-web.mjs: build script, output folder,
 * clean URLs, the same security headers, immutable caching only for hashed
 * files — and nothing that points at a local machine or needs secrets.
 * Usage: node scripts/verify-vercel-config.mjs
 */
import { readFileSync } from 'node:fs';

import { SECURITY_HEADERS } from './serve-web.mjs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const headersFor = (source) => Object.fromEntries((config.headers ?? []).find((h) => h.source === source)?.headers.map((h) => [h.key, h.value]) ?? []);

check('static site: no framework preset, no serverless functions', config.framework === null && !config.functions);
check('build runs the existing build:web script', config.buildCommand === 'pnpm build:web' && typeof pkg.scripts['build:web'] === 'string');
check('output is the export folder (dist)', config.outputDirectory === 'dist');
check('install covers only the website and its workspace packages (no API, no workers)', config.installCommand === 'pnpm install --frozen-lockfile --filter @mmusic/mobile...');
check('clean URLs (/home → home/index.html), no trailing slash', config.cleanUrls === true && config.trailingSlash === false);
const all = headersFor('/(.*)');
check('every page gets the reference security headers', Object.entries(SECURITY_HEADERS).every(([k, v]) => all[k] === v));
const immutable = 'public, max-age=31536000, immutable';
check('hashed bundles and assets are cached for a year', headersFor('/_expo/(.*)')['Cache-Control'] === immutable && headersFor('/assets/(.*)')['Cache-Control'] === immutable);
check('HTML is not cached long (no immutable rule for pages)', !(config.headers ?? []).some((h) => h.source === '/(.*)' && h.headers.some((x) => x.key === 'Cache-Control')));
const text = JSON.stringify(config);
check('no local hosts or LAN addresses', !/localhost|127\.0\.0\.1|172\.20\.|10\.0\.100|:8082|:8090/.test(text));
check('no environment variables or secrets in the config', !config.env && !config.build?.env && !/SECRET|API_KEY|DATABASE_URL|TOKEN/i.test(text));

if (failures > 0) {
  console.error(`\n${failures} vercel-config check(s) failed.`);
  process.exit(1);
}
console.log('\nAll vercel-config checks passed.');
