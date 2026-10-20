#!/usr/bin/env node
/**
 * @mmusic/core storage adapter (platform/storage.ts): the initialization
 * contract (pending → ready | unavailable), write safety before configuration,
 * reads/writes/removes, missing-backend and static-rendering behaviour, and
 * real Zustand `persist` stores using it — including stores created and
 * written before any backend exists.
 *
 * Usage: node core/scripts/verify-storage.mjs   (Node ≥ 22.6 runs the .ts directly)
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  StorageNotConfiguredError,
  configureStorage,
  platformStorage,
  resetStorageForTests,
  setStorageMisuseListener,
  storageDiagnostics,
  storageState,
} from '../platform/storage.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}
const throwsNotConfigured = (fn) => {
  try {
    fn();
    return false;
  } catch (e) {
    return e instanceof StorageNotConfiguredError && e.name === 'StorageNotConfiguredError';
  }
};
/** In-memory Web Storage stand-in that records every call. */
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  const calls = [];
  return {
    data,
    calls,
    getItem: (k) => (calls.push(['get', k]), data.has(k) ? data.get(k) : null),
    setItem: (k, v) => (calls.push(['set', k, v]), data.set(k, String(v))),
    removeItem: (k) => (calls.push(['remove', k]), data.delete(k)),
  };
}

// --- 1. Pending: writes are queued, never lost; reads fail loudly -------------
resetStorageForTests();
check('starts pending', storageState() === 'pending');
platformStorage.setItem('a', '1');
platformStorage.setItem('a', '2');
platformStorage.removeItem('b');
platformStorage.setItem('b', '3');
platformStorage.removeItem('a');
check('pending: 5 writes/removes queued', storageDiagnostics().pendingWrites === 5 && storageDiagnostics().queued === 5);
check('pending: a read throws StorageNotConfiguredError', throwsNotConfigured(() => platformStorage.getItem('a')));
check('pending: the error names the key', (() => { try { platformStorage.getItem('mmusic:locale'); } catch (e) { return e.message.includes('mmusic:locale'); } return false; })());

// --- 2. Configuring replays the queue in order — but never over saved data -----
const first = memoryStorage({ b: 'old', keep: 'x' });
configureStorage(first);
check('ready after configureStorage(backend)', storageState() === 'ready');
check('queued writes for a key without stored data replayed in order (a set, set, removed)', !first.data.has('a'));
check('a key that already holds stored data keeps it (b stays "old")', first.data.get('b') === 'old');
check('untouched keys survive the replay', first.data.get('keep') === 'x');
check('replay wrote only the unsaved key, in order', JSON.stringify(first.calls.filter(([op]) => op !== 'get')) === JSON.stringify([['set', 'a', '1'], ['set', 'a', '2'], ['remove', 'a']]));
check('diagnostics: 3 replayed, 2 skipped to protect stored data, none pending or dropped', (({ pendingWrites, replayed, skipped, dropped }) => pendingWrites === 0 && replayed === 3 && skipped === 2 && dropped === 0)(storageDiagnostics()));
check('the protected key is reported (key only)', storageDiagnostics().misuse.some((e) => e.kind === 'replay-skipped-existing-data' && e.key === 'b'));

// --- 3. Ready: exact pass-through ---------------------------------------------
const tricky = '{"state":{"likedTrackIds":["ошондо?","日本","a\\"b"]},"version":0}';
platformStorage.setItem('k', tricky);
check('ready: values pass through byte-for-byte', first.data.get('k') === tricky && platformStorage.getItem('k') === tricky);
check('ready: missing key reads null', platformStorage.getItem('nope') === null);
platformStorage.removeItem('k');
check('ready: remove deletes', !first.data.has('k'));
const failing = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
configureStorage(failing);
check('ready: backend errors propagate unchanged (quota)', (() => { try { platformStorage.setItem('x', 'y'); } catch (e) { return e.message === 'QuotaExceededError'; } return false; })());

// --- 4. Reconfiguration ---------------------------------------------------------
const second = memoryStorage();
configureStorage(second);
platformStorage.setItem('after', '1');
check('reconfigure: new writes go to the new backend only', second.data.get('after') === '1' && !first.data.has('after'));

// --- 5. Unavailable (static rendering / no storage): an explicit, counted no-op --
resetStorageForTests();
platformStorage.setItem('queued-before-ssr', '1');
configureStorage(null);
check('unavailable after configureStorage(null)', storageState() === 'unavailable');
check('unavailable: a read returns null (no throw)', platformStorage.getItem('anything') === null);
platformStorage.setItem('x', '1');
platformStorage.removeItem('x');
check('unavailable: writes queued before configuration and after are dropped and counted (3)', storageDiagnostics().dropped === 3 && storageDiagnostics().pendingWrites === 0);
const later = memoryStorage();
configureStorage(later);
platformStorage.setItem('late', '1');
check('unavailable → ready later works', later.data.get('late') === '1');

// --- 6. Zustand persist: store created and written BEFORE configuration ----------
resetStorageForTests();
const makeLocaleStore = (onRehydrate) =>
  create()(
    persist((set) => ({ locale: 'ru', setLocale: (locale) => set({ locale }) }), {
      name: 'mmusic:locale',
      storage: createJSONStorage(() => platformStorage),
      skipHydration: true,
      ...(onRehydrate ? { onRehydrateStorage: () => onRehydrate } : {}),
    }),
  );
const early = makeLocaleStore();
early.getState().setLocale('en');
check('persist before configuration: the write is queued, not lost', storageDiagnostics().pendingWrites === 1);
const browser = memoryStorage();
configureStorage(browser);
check('persist before configuration: replayed with the exact stored format', browser.data.get('mmusic:locale') === '{"state":{"locale":"en"},"version":0}');

// --- 7. Hydration after configuration restores saved data -----------------------
const fresh = makeLocaleStore();
check('fresh store starts with its default (ru)', fresh.getState().locale === 'ru');
await fresh.persist.rehydrate();
check('rehydrate after configuration restores the saved locale (en)', fresh.getState().locale === 'en' && fresh.persist.hasHydrated());

// --- 8. Hydrating before configuration is caught and cannot corrupt saved data ---
resetStorageForTests();
let hydrationError;
const tooEarly = makeLocaleStore((state, error) => { hydrationError = error; });
await tooEarly.persist.rehydrate();
check('hydrate before configuration reports StorageNotConfiguredError', hydrationError instanceof StorageNotConfiguredError);
check('…and is recorded as a read-before-configure misuse of that key', storageDiagnostics().misuse.some((e) => e.kind === 'read-before-configure' && e.key === 'mmusic:locale'));
check('…and the store keeps its default instead of a wrong value', tooEarly.getState().locale === 'ru');
const saved = memoryStorage({ 'mmusic:locale': '{"state":{"locale":"en"},"version":0}' });
configureStorage(saved);
check('…and nothing was queued over the saved value', saved.data.get('mmusic:locale') === '{"state":{"locale":"en"},"version":0}');

// --- 9. Static rendering: stores work, nothing is persisted, nothing throws -----
resetStorageForTests();
configureStorage(null);
const ssr = makeLocaleStore();
ssr.getState().setLocale('en');
await ssr.persist.rehydrate();
check('static rendering: state works in memory without storage', ssr.getState().locale === 'en');
check('static rendering: the write was an explicit, counted no-op', storageDiagnostics().dropped === 1);

// --- 10. partialize keeps the persisted subset and format (liked tracks shape) ---
resetStorageForTests();
const liked = memoryStorage();
configureStorage(liked);
const likedStore = create()(
  persist((set) => ({ likedTrackIds: new Set(['midnight-mirage']), playing: false, like: (id) => set((s) => ({ likedTrackIds: new Set([...s.likedTrackIds, id]) })) }), {
    name: 'mmusic:liked-tracks:alexrivers',
    storage: createJSONStorage(() => platformStorage),
    skipHydration: true,
    partialize: (s) => ({ likedTrackIds: Array.from(s.likedTrackIds) }),
  }),
);
likedStore.getState().like('horizon');
check('partialize: only the persisted subset, same JSON layout', liked.data.get('mmusic:liked-tracks:alexrivers') === '{"state":{"likedTrackIds":["midnight-mirage","horizon"]},"version":0}');

// --- 11. A write made before configuration never overwrites saved user data ----
resetStorageForTests();
const preConfig = makeLocaleStore();
preConfig.getState().setLocale('ru'); // e.g. a default written before the app configured storage
const savedUser = memoryStorage({ 'mmusic:locale': '{"state":{"locale":"en"},"version":0}' });
configureStorage(savedUser);
check('saved user data survives a pre-configuration write', savedUser.data.get('mmusic:locale') === '{"state":{"locale":"en"},"version":0}');
await preConfig.persist.rehydrate();
check('…and hydration then restores the saved value', preConfig.getState().locale === 'en');
check('…and the skipped write is reported', storageDiagnostics().skipped === 1 && storageDiagnostics().misuse.some((e) => e.kind === 'replay-skipped-existing-data'));

// --- 12. Misuse listener: late registration still sees earlier events; keys only --
resetStorageForTests();
platformStorage.setItem('mmusic:profile-avatar', 'data:image/png;base64,SECRETPIXELS');
try { platformStorage.getItem('mmusic:locale'); } catch { /* expected while pending */ }
const seen = [];
setStorageMisuseListener((e) => seen.push(e));
check('listener receives events recorded before it was set', seen.length === 2 && seen[0].kind === 'write-before-configure' && seen[1].kind === 'read-before-configure');
check('events carry the key only, never the stored value', !JSON.stringify(seen).includes('SECRETPIXELS') && seen.every((e) => Object.keys(e).sort().join() === 'key,kind'));
platformStorage.setItem('x', '1');
check('listener receives new events as they happen', seen.length === 3 && seen[2].key === 'x');
configureStorage(memoryStorage());
platformStorage.setItem('y', '1');
check('no events once storage is ready and used normally', seen.length === 3);

if (failures > 0) {
  console.error(`\n${failures} storage check(s) failed.`);
  process.exit(1);
}
console.log('\nAll storage adapter checks passed.');
