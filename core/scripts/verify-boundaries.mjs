#!/usr/bin/env node
/**
 * @mmusic/core dependency boundaries: core is shared by the Expo app and the
 * Vite website, so it may import only its own files (relative paths that stay
 * inside core) and the packages allowed below — never React Native, Expo, the
 * apps, DOM-only ui-kit code or bundled assets. Also fails on import cycles.
 *
 * Usage: node core/scripts/verify-boundaries.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIRS = ['lib'];
const ALLOWED_PACKAGES = []; // e.g. 'zustand', '@mmusic/ui-kit/tokens' — added per migration group, with approval

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
const files = SOURCE_DIRS.filter((d) => existsSync(join(root, d))).flatMap((d) => walk(join(root, d)));

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const SPECIFIER = /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const graph = new Map();

for (const file of files) {
  const name = relative(root, file);
  const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check(`${name}: plain .ts (no JSX components)`, file.endsWith('.ts'));
  const deps = [];
  for (const m of code.matchAll(SPECIFIER)) {
    const spec = m[1] || m[2] || m[3];
    if (spec.startsWith('.')) {
      const target = resolve(dirname(file), spec);
      const resolved = [target, `${target}.ts`, join(target, 'index.ts')].find((p) => existsSync(p) && statSync(p).isFile());
      check(`${name}: "${spec}" stays inside core and resolves`, Boolean(resolved) && !relative(root, resolved).startsWith('..'));
      check(`${name}: "${spec}" is not a bundled asset`, !/\.(jpe?g|png|webp|gif|mp3|ttf|otf)$/.test(spec));
      if (resolved) deps.push(relative(root, resolved));
    } else {
      check(`${name}: package "${spec}" is allowed in core`, ALLOWED_PACKAGES.includes(spec));
    }
  }
  check(`${name}: no "@/" app alias, React Native, Expo or DOM-only code`, !/['"](@\/|react-native|expo|@expo\/|react-dom|@mmusic\/ui-kit\/web)/.test(code));
  graph.set(name, deps);
}

// Import cycles inside core.
const state = new Map();
const cycles = [];
function visit(node, path) {
  state.set(node, 'open');
  for (const dep of graph.get(node) ?? []) {
    if (state.get(dep) === 'open') cycles.push([...path.slice(path.indexOf(dep)), dep].join(' -> '));
    else if (!state.has(dep)) visit(dep, [...path, dep]);
  }
  state.set(node, 'done');
}
for (const node of graph.keys()) if (!state.has(node)) visit(node, [node]);
check(`no import cycles inside core (${graph.size} modules)`, cycles.length === 0);
for (const cycle of cycles) console.error(`  cycle: ${cycle}`);

if (failures > 0) {
  console.error(`\n${failures} core boundary check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll core boundary checks passed (${files.length} modules).`);
