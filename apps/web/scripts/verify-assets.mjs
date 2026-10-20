// Production asset safety for the website build (W2.4c-2) — run after `vite build`:
// - every audio/image file in dist/ is, byte for byte (SHA-256), one of the files listed in the production asset
//   tables (src/assets/audio-assets.ts, src/assets/artwork-assets.ts) — nothing else from apps/mobile/assets;
// - nothing development-only: Ошондо (both identical MP3 copies, incl. the duplicate "… (Mood Video).mp3", and its
//   cover) is absent by file name, content hash and text (UTF-8 and UTF-16);
// - no environment-file value is embedded (names are reported, never values).
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = fileURLToPath(new URL('..', import.meta.url));
const REPO = join(WEB, '..', '..');
const MOBILE_ASSETS = join(REPO, 'apps', 'mobile', 'assets');
const dist = process.argv[2] ?? join(WEB, 'dist'); // optional: another build output folder
const MEDIA = new Set(['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const TEXT = new Set(['.js', '.css', '.html', '.json', '.map', '.svg', '.txt']);
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));

if (!existsSync(dist)) {
  console.error(`No build found at ${dist}. Run "pnpm --filter @mmusic/web build" first.`);
  process.exit(1);
}

// Approved: the files the production tables import (the *.dev.ts tables are development-only by construction).
const approved = new Map();
for (const table of ['audio-assets.ts', 'artwork-assets.ts']) {
  const src = readFileSync(join(WEB, 'src', 'assets', table), 'utf8');
  for (const [, path] of src.matchAll(/^import \w+ from '\.\.\/\.\.\/\.\.\/mobile\/assets\/([^']+)\?url';$/gm)) approved.set(sha(join(MOBILE_ASSETS, path)), path);
}
// Banned: every Ошондо file in the Expo app's assets, wherever it sits and whatever it is called.
const banned = new Map(
  walk(MOBILE_ASSETS)
    .filter((p) => /oshondo|шондо/i.test(p))
    .map((p) => [sha(p), relative(MOBILE_ASSETS, p)]),
);
// Ошондо-specific words only: its artist (Мирбек Атабеков) has other, production tracks.
const WORDS = ['Ошондо', 'ошондо', 'Oshondo', 'oshondo', 'Mood Video'];
const encodings = (w) => [Buffer.from(w, 'utf8'), Buffer.from(w, 'utf16le'), Buffer.from(w, 'utf16le').swap16()];
const envFiles = [REPO, ...readdirSync(join(REPO, 'apps')).map((app) => join(REPO, 'apps', app))]
  .filter((dir) => statSync(dir).isDirectory())
  .flatMap((dir) => readdirSync(dir).filter((n) => n.startsWith('.env')).map((n) => join(dir, n)))
  .filter((p) => statSync(p).isFile());
const envValues = envFiles
  .flatMap((file) => readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => ({ file: relative(REPO, file), name: l.split('=')[0].trim(), value: l.slice(l.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') })))
  .filter(({ value }) => value.length >= 6 && value !== 'development');

const problems = [];
let media = 0;
for (const file of walk(dist)) {
  const rel = relative(dist, file);
  const data = readFileSync(file);
  const hash = createHash('sha256').update(data).digest('hex');
  if (/oshondo|шондо|mood video/i.test(basename(file))) problems.push(`${rel}: development-only file name`);
  if (banned.has(hash)) problems.push(`${rel}: same bytes as development-only ${banned.get(hash)}`);
  if (WORDS.some((w) => encodings(w).some((b) => data.includes(b)))) problems.push(`${rel}: mentions Ошондо`);
  if (MEDIA.has(extname(file).toLowerCase())) {
    media += 1;
    if (!approved.has(hash)) problems.push(`${rel}: media file not in the production asset tables`);
  }
  if (TEXT.has(extname(file))) for (const { file: envFile, name, value } of envValues) if (data.includes(Buffer.from(value))) problems.push(`${rel}: contains the value of ${name} (${envFile})`);
}

if (problems.length > 0) {
  console.error(`✗ Website build asset problems:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ OK       ${media} media file(s) in dist, all from the production asset tables (${approved.size} approved files); Ошондо absent by name, hash (${banned.size} files) and text; no env values`);
