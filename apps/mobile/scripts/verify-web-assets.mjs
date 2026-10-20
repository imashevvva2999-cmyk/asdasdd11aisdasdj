#!/usr/bin/env node
/**
 * W2.4c-2 website asset tables (apps/web/src/assets/*.ts) against the Expo app's
 * require() tables and @mmusic/core's keys:
 * - same keys, same files (the website reuses apps/mobile/assets in place), every
 *   file exists, every catalog audio/artwork key resolves;
 * - development-only content (Ошондо: its audio and cover) lives ONLY in the
 *   *.dev.ts modules, which the main tables load through a dynamic import behind
 *   `import.meta.env.DEV` (Vite then drops it from production builds);
 * - the 20 Kyrgyz metadata-only tracks still have no audio;
 * - no folder-wide globs; the website references apps/mobile only through
 *   explicit `?url` imports of approved asset files, never the duplicate
 *   "Ошондо (Mood Video).mp3".
 * The built output is checked separately by apps/web/scripts/verify-assets.mjs.
 *
 * Usage: npx tsx scripts/verify-web-assets.mjs
 */
import './dev-mode.mjs'; // development view of the catalog (includes Ошондо); production keys are derived below
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PENDING_AUDIO_TRACK_IDS, demoAudioKeys } from '../src/audio/demo-audio-keys.ts';
import { artworkSources } from '../src/constants/artwork-sources.ts';

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(MOBILE, '..', 'web');
const ASSETS = join(WEB, 'src', 'assets');
let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}
const sameSet = (a, b) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
const live = (file) => readFileSync(file, 'utf8').split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
// The Expo app's audio require() table, read from source: Node cannot require() an .mp3.
const audioSourceKeys = [...live(join(MOBILE, 'src/audio/demo-sources.ts')).matchAll(/'(audio:[^']+)':\s*require\('\.\.\/\.\.\/assets\/audio\/[^']+'\)/g)].map((m) => m[1]);

/** key → imported file of one website table: `import id from '../../../mobile/assets/<dir>/<file>?url'` + `'<prefix><path>': id`. */
function parseTable(file, dir, prefix) {
  const src = live(join(ASSETS, file));
  const imports = new Map([...src.matchAll(/^import (\w+) from '\.\.\/\.\.\/\.\.\/mobile\/assets\/([^']+)\?url';$/gm)].map(([, id, path]) => [id, path]));
  const entries = [...src.matchAll(new RegExp(`^\\s+'${prefix}([^']+)': (\\w+),$`, 'gm'))].map(([, key, id]) => ({ key, id, path: imports.get(id) }));
  return { src, imports, entries, keys: entries.map((e) => `${prefix}${e.key}`), dir };
}
const tables = {
  audio: parseTable('audio-assets.ts', 'audio', 'audio:'),
  audioDev: parseTable('audio-assets.dev.ts', 'audio', 'audio:'),
  artwork: parseTable('artwork-assets.ts', 'artwork', 'asset:'),
  artworkDev: parseTable('artwork-assets.dev.ts', 'artwork', 'asset:'),
};
for (const [name, t] of Object.entries(tables)) {
  check(`${name}: every entry uses exactly one explicit import, and every import is used once`, t.entries.length > 0 && t.entries.length === t.imports.size && t.entries.every((e) => e.path !== undefined) && new Set(t.entries.map((e) => e.id)).size === t.entries.length);
  check(`${name}: every key names the file it imports (assets/${t.dir}/<key path>)`, t.entries.every((e) => e.path === `${t.dir}/${e.key}`));
  check(`${name}: every imported file exists and is non-empty`, t.entries.every((e) => existsSync(join(MOBILE, 'assets', e.path)) && statSync(join(MOBILE, 'assets', e.path)).size > 0));
}

// --- Production vs development key sets (production = what core yields without __DEV__) ---------------
const prodKeys = JSON.parse(
  execFileSync(process.execPath, ['--import', 'tsx', '-e', `
    const a = await import(${JSON.stringify(join(MOBILE, 'src/audio/demo-audio-keys.ts'))});
    const s = await import(${JSON.stringify(join(MOBILE, '../../core/constants/stitch-artwork.ts'))});
    const art = new Set(); const walk = (v) => { if (typeof v === 'string' && v.startsWith('asset:')) art.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    walk(s);
    console.log(JSON.stringify({ audio: Object.values(a.demoAudioKeys), artwork: [...art], dev: typeof globalThis.__DEV__ }));`], { cwd: MOBILE, encoding: 'utf8' }),
);
check('production view: __DEV__ undefined in the child process', prodKeys.dev === 'undefined');
const devAudioKeys = [...new Set(Object.values(demoAudioKeys))];
const prodAudioKeys = [...new Set(prodKeys.audio)];
const devOnlyAudio = devAudioKeys.filter((k) => !prodAudioKeys.includes(k));
check('audio: main table = exactly the production audio keys', sameSet(tables.audio.keys, prodAudioKeys));
check('audio: dev table = exactly the development-only audio keys (Ошондо)', sameSet(tables.audioDev.keys, devOnlyAudio) && devOnlyAudio.length === 1 && devOnlyAudio[0] === 'audio:kyrgyz/oshondo.mp3');
check('audio: main ∪ dev = the Expo app\'s require() table (same keys)', audioSourceKeys.length === 14 && sameSet([...tables.audio.keys, ...tables.audioDev.keys], audioSourceKeys));
check('audio: every playable track (development view) resolves', Object.values(demoAudioKeys).every((k) => [...tables.audio.keys, ...tables.audioDev.keys].includes(k)));
check('artwork: main ∪ dev = the Expo app\'s require() table (same keys)', sameSet([...tables.artwork.keys, ...tables.artworkDev.keys], Object.keys(artworkSources)));
check('artwork: dev table = exactly Ошондо\'s cover', sameSet(tables.artworkDev.keys, ['asset:tracks/mirbek-atabekov-oshondo.png']));
check('artwork: every production catalog artwork key resolves in the main table', prodKeys.artwork.every((k) => tables.artwork.keys.includes(k)));
check('artwork: no production artwork key is development-only', !prodKeys.artwork.some((k) => tables.artworkDev.keys.includes(k)));

// --- The 20 Kyrgyz metadata-only tracks --------------------------------------------------------------
const KYRGYZ_PENDING = ['kyrgyzstanym', 'muras', 'ene-til', 'alai', 'kachan-kaitat', 'jazym-kelchi', 'kyrgyz-biyi', 'ne-segodnya', 'kirgiz-jeri', 'erke-kyz', 'chopo-choor-fantasy', 'kyrgyzstanym-remix', 'jashtyk-kez', 'kambarkan', 'esimde', 'kyrgyz-bala', 'taimuras', 'ananayyn', 'eto-lyubov', 'issyk-kulskiy-vaib'];
check('the 20 Kyrgyz metadata-only tracks are unchanged', JSON.stringify(PENDING_AUDIO_TRACK_IDS) === JSON.stringify(KYRGYZ_PENDING));
check('…and none of them has an audio key (so no website audio either)', KYRGYZ_PENDING.every((id) => demoAudioKeys[id] === undefined));

// --- Production safety of the sources --------------------------------------------------------------
for (const [main, dev] of [['audio-assets.ts', 'audio-assets.dev'], ['artwork-assets.ts', 'artwork-assets.dev']]) {
  const src = live(join(ASSETS, main));
  const loads = [...src.matchAll(/import\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
  check(`${main}: its only dynamic import is ./${dev}, inside \`if (import.meta.env.DEV)\``, loads.length === 1 && loads[0] === `./${dev}` && new RegExp(`^if \\(import\\.meta\\.env\\.DEV\\) Object\\.assign\\(\\w+, \\(await import\\('\\./${dev.replace('.', '\\.')}'\\)\\)\\.\\w+\\);$`, 'm').test(src));
  check(`${main}: no development-only file (Ошондо) is imported statically`, !/oshondo|шондо|kyrgyz\//i.test(src));
}
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const webFiles = walk(join(WEB, 'src')).filter((f) => /\.(tsx?|css)$/.test(f));
check('apps/web/src: no folder-wide glob imports (import.meta.glob)', !webFiles.some((f) => /import\.meta\.glob/.test(readFileSync(f, 'utf8'))));
check('apps/web/src: no reference to the duplicate "Ошондо (Mood Video).mp3"', !webFiles.some((f) => /Mood Video|Атабеков - /.test(readFileSync(f, 'utf8'))));
const mobileRefs = webFiles.flatMap((f) => [...live(f).matchAll(/['"`]([^'"`\n]*mobile\/[^'"`\n]*)['"`]/g)].map((m) => ({ file: relative(WEB, f), spec: m[1] })));
check('apps/web/src references apps/mobile only via `?url` imports of assets/audio or assets/artwork, in the asset tables', mobileRefs.length > 0 && mobileRefs.every(({ file, spec }) => /^src\/assets\/(audio|artwork)-assets(\.dev)?\.ts$/.test(file) && /^\.\.\/\.\.\/\.\.\/mobile\/assets\/(audio|artwork)\/[^?]+\?url$/.test(spec)));
check('Ошондо appears only in the two development-only modules', webFiles.filter((f) => /oshondo/i.test(readFileSync(f, 'utf8'))).map((f) => relative(WEB, f)).sort().join() === 'src/assets/artwork-assets.dev.ts,src/assets/audio-assets.dev.ts');

if (failures > 0) {
  console.error(`\n${failures} website asset check(s) failed.`);
  process.exit(1);
}
console.log('\nAll website asset checks passed.');
