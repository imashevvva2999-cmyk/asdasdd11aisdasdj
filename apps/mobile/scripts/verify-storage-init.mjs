#!/usr/bin/env node
/**
 * Storage start-up safety for @mmusic/core's persisted stores.
 *
 * 1. Import order (static): every core module that reaches core/platform/storage
 *    (a persisted store, or anything importing one) may be imported by an app
 *    file only if that file's FIRST import is '@/platform/storage', which
 *    configures the backend — so no persisted store can be created, let alone
 *    hydrated, against an unconfigured adapter. The website has no storage
 *    set-up yet, so it may not import them at all.
 * 2. Backend choice (runtime): localStorage when usable; no storage — without
 *    throwing — on native/static rendering (no window or no localStorage) and
 *    when the browser blocks site data (reading window.localStorage throws).
 *
 * Usage: npx tsx scripts/verify-storage-init.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOBILE = join(__dirname, '..');
const REPO = join(MOBILE, '..', '..');
const CORE = join(REPO, 'core');

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const walk = (dir) =>
  !existsSync(dir)
    ? []
    : readdirSync(dir).flatMap((name) => {
        if (name === 'node_modules' || name.startsWith('.')) return [];
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : /\.(tsx?|mjs|cjs|js)$/.test(name) ? [path] : [];
      });
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
/** Runtime import specifiers in source order (type-only imports and re-exports are skipped). */
function runtimeImports(file) {
  const src = stripComments(readFileSync(file, 'utf8'));
  const re = /\b(import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]|\b(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g;
  const out = [];
  for (let m; (m = re.exec(src)); ) if (!m[2]) out.push(m[3] ?? m[4]);
  return out;
}

// --- 1. Which core modules reach the storage adapter -----------------------------
const STORAGE = join(CORE, 'platform', 'storage.ts');
const coreFiles = walk(CORE).filter((f) => f.endsWith('.ts') && !f.startsWith(join(CORE, 'scripts')));
const resolveCore = (from, spec) => {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(from), spec);
  return [base, `${base}.ts`, join(base, 'index.ts')].find((p) => existsSync(p) && statSync(p).isFile()) ?? null;
};
const edges = new Map(coreFiles.map((f) => [f, runtimeImports(f).map((s) => resolveCore(f, s)).filter(Boolean)]));
const reaches = new Map();
const reachesStorage = (f, seen = new Set()) => {
  if (reaches.has(f)) return reaches.get(f);
  if (seen.has(f)) return false;
  seen.add(f);
  const r = (edges.get(f) ?? []).some((d) => d === STORAGE || reachesStorage(d, seen));
  reaches.set(f, r);
  return r;
};
const guarded = new Set(coreFiles.filter((f) => reachesStorage(f)).map((f) => relative(CORE, f).replace(/\.ts$/, '').replace(/\/index$/, '')));
console.log(`core modules that use the storage adapter: ${[...guarded].sort().join(', ')}`);
check('the persisted stores are among them', ['state/locale-store', 'state/profile-avatar-store', 'state/floating-button-store', 'state/dashboard-locale-store'].every((m) => guarded.has(m)));

// --- 2. App files importing them must configure storage first ----------------------
const coreTarget = (spec) => (spec.startsWith('@mmusic/core/') ? spec.slice('@mmusic/core/'.length).replace(/\.ts$/, '') : null);
const appFiles = [...walk(join(MOBILE, 'src')), ...walk(join(MOBILE, 'scripts')), ...walk(join(REPO, 'apps', 'web', 'src')), ...walk(join(REPO, 'apps', 'web', 'scripts'))];
const importers = [];
for (const file of appFiles) {
  const specs = runtimeImports(file);
  const hits = specs.filter((s) => guarded.has(coreTarget(s) ?? ''));
  if (!hits.length) continue;
  const rel = relative(REPO, file);
  importers.push(rel);
  const isMobile = rel.startsWith('apps/mobile/');
  check(
    `${rel} imports ${hits.join(', ')} only after configuring storage (first import is '@/platform/storage')`,
    isMobile && specs[0] === '@/platform/storage',
  );
}
const REEXPORTS = ['locale-store', 'profile-avatar-store', 'floating-button-store', 'dashboard-locale-store', 'artist-account-persistence', 'demo-session-store'];
check('the compatibility re-exports in src/state are the only app importers', JSON.stringify(importers.sort()) === JSON.stringify(REEXPORTS.map((n) => `apps/mobile/src/state/${n}.ts`).sort()));
const setup = readFileSync(join(MOBILE, 'src', 'platform', 'storage.ts'), 'utf8');
check('src/platform/storage.ts configures storage at module level', /^configureStorage\(browserLocalStorage\(\)\);$/m.test(setup));

// --- 3. Backend choice at runtime -----------------------------------------------------
const { browserLocalStorage } = await import('../src/platform/browser-storage.ts');
const fake = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const withWindow = (win, fn) => {
  const had = 'window' in globalThis, prev = globalThis.window;
  if (win === undefined) delete globalThis.window; else globalThis.window = win;
  try { return fn(); } finally { if (had) globalThis.window = prev; else delete globalThis.window; }
};
check('web: returns window.localStorage', withWindow({ localStorage: fake }, () => browserLocalStorage()) === fake);
check('static rendering / Node (no window): null, no throw', withWindow(undefined, () => browserLocalStorage()) === null);
check('native (window without localStorage): null, no throw', withWindow({}, () => browserLocalStorage()) === null);
const blocked = Object.defineProperty({}, 'localStorage', { get() { const e = new Error('The operation is insecure.'); e.name = 'SecurityError'; throw e; } });
check('blocked site data (getter throws SecurityError): null, no throw', withWindow(blocked, () => browserLocalStorage()) === null);

// The real start-up path with blocked storage: the persisted stores load, work in
// memory and never touch storage — instead of the module import throwing.
globalThis.window = blocked;
const { storageState } = await import('@mmusic/core/platform/storage');
const { useLocaleStore } = await import('../src/state/locale-store.ts');
check('blocked: importing a persisted store does not throw; storage is "unavailable"', storageState() === 'unavailable');
await useLocaleStore.persist.rehydrate();
check('blocked: hydration keeps the RU default', useLocaleStore.getState().locale === 'ru');
useLocaleStore.getState().setLocale('en');
check('blocked: switching language still works (in memory)', useLocaleStore.getState().locale === 'en');
useLocaleStore.getState().setLocale('ru');
delete globalThis.window;

if (failures > 0) {
  console.error(`\n${failures} storage-init check(s) failed.`);
  process.exit(1);
}
console.log('\nAll storage-init checks passed.');
