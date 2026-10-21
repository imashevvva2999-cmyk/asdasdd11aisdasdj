#!/usr/bin/env node
/**
 * Import boundaries of the back-office apps (docs/arm-crm-plan.md):
 *  - ARM, CRM and @mmusic/backoffice never import the public website, the mobile app, React Native or Expo;
 *  - ARM and CRM never import each other (independent apps, shared code only via @mmusic/backoffice);
 *  - the website, the mobile app, @mmusic/core and @mmusic/ui-kit never import ARM, CRM or @mmusic/backoffice.
 * Usage: node packages/backoffice/scripts/verify-boundaries.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const CODE = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const SKIP = new Set(['node_modules', 'dist', '.expo', '.turbo', '.claude-flow']);
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

const NATIVE = /^(react-native|@react-native\/|expo($|[-/])|@expo\/)/;
const WEB_OR_MOBILE = /(^@mmusic\/(web|mobile)($|\/))|apps\/(web|mobile)\//;
const BACKOFFICE = /^@mmusic\/(backoffice|arm|crm)($|\/)|apps\/(arm|crm)\/|packages\/backoffice\//;

const rules = [
  { dir: 'apps/arm/src', forbid: [NATIVE, WEB_OR_MOBILE, /^@mmusic\/crm($|\/)|apps\/crm\//], label: 'ARM' },
  { dir: 'apps/crm/src', forbid: [NATIVE, WEB_OR_MOBILE, /^@mmusic\/arm($|\/)|apps\/arm\//], label: 'CRM' },
  { dir: 'packages/backoffice/src', forbid: [NATIVE, WEB_OR_MOBILE, /^@mmusic\/(arm|crm)($|\/)|apps\//], label: '@mmusic/backoffice' },
  { dir: 'apps/web/src', forbid: [BACKOFFICE], label: 'website' },
  { dir: 'apps/mobile/src', forbid: [BACKOFFICE], label: 'mobile app' },
  { dir: 'core', forbid: [BACKOFFICE], label: '@mmusic/core' },
  { dir: 'ui-kit', forbid: [BACKOFFICE], label: '@mmusic/ui-kit' },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (CODE.has(extname(name))) yield path;
  }
}

let checked = 0;
const hits = [];
for (const rule of rules) {
  const dir = join(root, rule.dir);
  if (!existsSync(dir)) {
    hits.push(`${rule.dir}: missing directory`);
    continue;
  }
  for (const file of files(dir)) {
    checked += 1;
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(IMPORT)) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (rule.forbid.some((re) => re.test(spec))) hits.push(`${relative(root, file)} (${rule.label}) imports "${spec}"`);
    }
  }
}

if (hits.length > 0) {
  console.error(`✗ Back-office boundary violations:\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ OK       ${checked} files checked: ARM / CRM / backoffice stay separate from the website, the mobile app and each other`);
