// Fails if the production build contains React Native / Expo code or references the Expo app's sources.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const FORBIDDEN = [
  /\breact-native\b/,
  /\bexpo-(router|modules-core|font|audio|image|blur|linear-gradient|asset|constants)\b/,
  /@expo\/vector-icons/,
  /apps\/mobile\//,
];
const TEXT = new Set(['.js', '.css', '.html', '.map', '.json']);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

let checked = 0;
const hits = [];
try {
  for (const file of files(dist)) {
    if (!TEXT.has(extname(file))) continue;
    checked += 1;
    const text = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN) if (pattern.test(text)) hits.push(`${relative(dist, file)}: ${pattern}`);
  }
} catch (error) {
  console.error(`No build found at ${dist}. Run "pnpm --filter @mmusic/web build" first.`, error.message);
  process.exit(1);
}

if (hits.length > 0) {
  console.error(`✗ React Native / Expo traces found in the web build:\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ OK       ${checked} build files checked: no React Native / Expo code, no apps/mobile references`);
