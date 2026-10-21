#!/usr/bin/env node
/**
 * Production-build safety of a back-office app (ARM or CRM):
 *  - marked as a non-indexed local prototype (robots noindex) in index.html;
 *  - no React Native / Expo code, no website or mobile-app sources;
 *  - no development-only catalog content (Ошондо) and no audio files, except those named with --allow-audio
 *    (exactly those, each present once — e.g. ARM's one licensed demo recording);
 *  - no environment secrets (env-variable names of the mobile/deploy setup, private keys, live API keys).
 * Usage: node packages/backoffice/scripts/verify-dist.mjs <app dist directory> [--allow-audio <file.mp3> …]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const dist = resolve(args[0] ?? '');
const allowedAudio = args.flatMap((a, i) => (args[i - 1] === '--allow-audio' ? [a] : []));
/** Vite names an emitted asset <stem>-<hash><ext>. */
const allowedFor = (file) => allowedAudio.find((name) => {
  const ext = extname(name);
  return new RegExp(`^${name.slice(0, -ext.length).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[\\w-]{6,}\\${ext}$`).test(basename(file));
});
const audioSeen = new Map();
const TEXT = new Set(['.js', '.css', '.html', '.json', '.map', '.txt', '.svg']);
const AUDIO = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);
const FORBIDDEN = [
  [/\breact-native\b/, 'React Native'],
  [/@expo\/vector-icons|\bexpo-(router|modules-core|audio|image)\b/, 'Expo'],
  [/apps\/(web|mobile)\//, 'website / mobile sources'],
  [/Ошондо|oshondo/i, 'development-only content (Ошондо)'],
  [/VERCEL_OIDC|EXPO_PUBLIC_|DEMO_ARTIST_PASSWORD|PASSWORD_SHA256/, 'environment variable names'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----|\bsk_live_[0-9a-zA-Z]+/, 'private key / live API key'],
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

const hits = [];
let checked = 0;
let stylesheets = 0;
try {
  const index = readFileSync(join(dist, 'index.html'), 'utf8');
  if (!/<meta name="robots" content="noindex, nofollow"/.test(index)) hits.push('index.html: missing <meta name="robots" content="noindex, nofollow">');
  for (const file of files(dist)) {
    const ext = extname(file).toLowerCase();
    if (AUDIO.has(ext)) {
      const allowed = allowedFor(file);
      if (allowed) audioSeen.set(allowed, (audioSeen.get(allowed) ?? 0) + 1);
      else hits.push(`${relative(dist, file)}: audio file in a back-office build`);
    }
    if (/oshondo|ошондо/i.test(file)) hits.push(`${relative(dist, file)}: development-only file`);
    if (ext === '.css') stylesheets += 1;
    if (!TEXT.has(ext)) continue;
    checked += 1;
    const text = readFileSync(file, 'utf8');
    for (const [re, label] of FORBIDDEN) if (re.test(text)) hits.push(`${relative(dist, file)}: ${label}`);
  }
} catch (error) {
  console.error(`No build found at ${dist}. Build the app first.`, error.message);
  process.exit(1);
}
// The back-office stylesheet is imported for its side effect; a tree-shaking misconfiguration once dropped it silently.
if (stylesheets === 0) hits.push('no stylesheet in the build (the back-office CSS was dropped)');
for (const name of allowedAudio) if (audioSeen.get(name) !== 1) hits.push(`${name}: expected exactly once in the build, found ${audioSeen.get(name) ?? 0}`);

if (hits.length > 0) {
  console.error(`✗ Back-office build check failed:\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ OK       ${relative(process.cwd(), dist) || dist}: ${checked} text files — noindex, no native/website code, no Ошондо, ${allowedAudio.length ? `only allowed audio (${allowedAudio.join(', ')})` : 'no audio'}, no secrets`);
