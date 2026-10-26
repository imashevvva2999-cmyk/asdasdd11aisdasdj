#!/usr/bin/env node
/**
 * iOS/Android persistence across app restarts. Each "launch" is a separate
 * process (fresh modules, like a cold start) running the native start-up
 * order — storage configured (storage.native.ts), app-state persistence on,
 * persisted stores hydrated on load (hydrate.native.ts), then the root
 * layout's account restore, demo session and wallet rule — against one
 * file-backed key-value store standing in for the SQLite database (same
 * synchronous contract). Covers persistence, hydration order, account
 * switching (demo login, Demo Artist preview), corrupted and unavailable
 * storage, and that the website mode never stores the native-only state.
 * Usage: npx tsx scripts/verify-native-persistence.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);

/** File-backed KeyValueStorage: every write lands on disk at once, like SQLite. */
function fileStorage(file) {
  const read = () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});
  return {
    getItem: (key) => read()[key] ?? null,
    setItem: (key, value) => writeFileSync(file, JSON.stringify({ ...read(), [key]: value })),
    removeItem: (key) => {
      const all = read();
      delete all[key];
      writeFileSync(file, JSON.stringify(all));
    },
  };
}

// ---------------------------------------------------------------- child: one app launch
async function launch(file, scenario) {
  const storage = await import('../../../core/platform/storage.ts');
  const appState = await import('../../../core/platform/app-state-storage.ts');
  if (scenario === 'unavailable') storage.configureStorage(null);
  else storage.configureStorage(fileStorage(file));
  if (scenario !== 'website') appState.enableAppStatePersistence();

  const { useLocaleStore } = await import('../../../core/state/locale-store.ts');
  const { useProfileAvatarStore } = await import('../../../core/state/profile-avatar-store.ts');
  const { usePlayerStore } = await import('../../../core/state/player-store.ts');
  const { useLibraryStore } = await import('../../../core/state/library-store.ts');
  const { usePlaylistsStore } = await import('../../../core/state/playlists-store.ts');
  const { useSettingsStore } = await import('../../../core/state/settings-store.ts');
  const { useSupportStore } = await import('../../../core/state/support-store.ts');
  const { useNotificationsStore } = await import('../../../core/state/notifications-store.ts');
  const { useArtistStore } = await import('../../../core/state/artist-store.ts');
  const { useCampaignStore } = await import('../../../core/state/campaign-store.ts');
  const { restoreArtistAccount } = await import('../../../core/state/artist-account-persistence.ts');
  const demo = await import('../../../core/state/demo-session-store.ts');
  const { keepRealWalletAtZero } = await import('../../../core/state/promo-wallet-rule.ts');

  const persisted = [useLocaleStore, useProfileAvatarStore, usePlayerStore, useLibraryStore, usePlaylistsStore, useSettingsStore, useSupportStore, useNotificationsStore];
  if (scenario === 'set-before-hydrate') {
    // A store changed before it hydrates (e.g. by its own module set-up) must not replace saved data.
    useLibraryStore.setState({ followedGenreIds: new Set(['before-hydration']) });
    useSettingsStore.setState({ lossless: true });
  }
  if (scenario !== 'website') for (const store of persisted) await store.persist.rehydrate(); // hydrate.native.ts
  restoreArtistAccount(); // root layout effects, in order
  await demo.useDemoSessionStore.persist.rehydrate();
  keepRealWalletAtZero();

  const state = () => ({
    locale: useLocaleStore.getState().locale,
    avatar: useProfileAvatarStore.getState().photoUri ?? null,
    liked: [...usePlayerStore.getState().likedTrackIds].sort(),
    librarySaved: useLibraryStore.getState().items.map((i) => `${i.kind}:${i.refId}`),
    followedGenres: [...useLibraryStore.getState().followedGenreIds].sort(),
    playlists: usePlaylistsStore.getState().playlists.map((p) => p.title),
    lossless: useSettingsStore.getState().lossless,
    crossfadeSec: useSettingsStore.getState().crossfadeSec,
    donations: useSupportStore.getState().history.map((h) => `${h.artistId}:${h.amount}`),
    unread: useNotificationsStore.getState().items.filter((n) => !n.read).length,
    artist: useArtistStore.getState().artist?.name ?? null,
    draftTrack: useCampaignStore.getState().trackId ?? null,
    draftPackage: useCampaignStore.getState().packageId ?? null,
    wallet: useCampaignStore.getState().walletBalanceKgs,
    demoActive: demo.useDemoSessionStore.getState().active,
  });
  const out = { start: state() };

  if (scenario === 'first' || scenario === 'website') {
    useLocaleStore.getState().setLocale('en');
    useProfileAvatarStore.getState().setPhotoUri('file:///avatar.jpg');
    usePlayerStore.getState().toggleLike('horizon');
    useLibraryStore.getState().toggleSaved('artist', 'kaelen'); // a seed item: unsaved
    useLibraryStore.getState().toggleSaved('artist', 'arlo'); // not in the seed: saved
    useLibraryStore.getState().toggleGenreFollowed('synthwave');
    usePlaylistsStore.getState().createPlaylist({ title: 'Road Trip', initialTrackId: 'horizon' });
    useSettingsStore.getState().setFlag('lossless', false);
    useSettingsStore.getState().setCrossfade(7);
    useSupportStore.getState().startSupport('kaelen');
    useSupportStore.getState().selectAmount(250);
    await useSupportStore.getState().confirm();
    useNotificationsStore.getState().markAllRead();
    useArtistStore.getState().createArtistProfile({ stageName: 'Own Artist' });
    useCampaignStore.getState().startCampaign('horizon');
    useCampaignStore.getState().selectPackage('spotlight');
  }
  if (scenario === 'switch') {
    demo.useDemoSessionStore.getState().signIn();
    out.duringDemoLogin = state();
    demo.useDemoSessionStore.getState().signOut();
    restoreArtistAccount(); // the app restores the regular account after leaving the demo
    out.afterDemoLogin = state();
    demo.enterGuestPreview();
    out.duringPreview = state();
    demo.exitGuestPreview();
    out.afterPreview = state();
  }
  out.end = state();
  out.diagnostics = storage.storageDiagnostics();
  process.stdout.write(`\n@@RESULT@@${JSON.stringify(out)}`);
}

if (process.argv[2] === '--launch') {
  await launch(process.argv[3], process.argv[4]);
  process.exit(0);
}

// ---------------------------------------------------------------- parent: the checks
let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}
const tsx = join(fileURLToPath(new URL('..', import.meta.url)), 'node_modules', '.bin', 'tsx');
function run(file, scenario) {
  const r = spawnSync(tsx, [SELF, '--launch', file, scenario], { encoding: 'utf8' });
  const marker = r.stdout.lastIndexOf('@@RESULT@@');
  if (r.status !== 0 || marker < 0) {
    console.error(r.stdout, r.stderr);
    throw new Error(`launch "${scenario}" failed (exit ${r.status})`);
  }
  return JSON.parse(r.stdout.slice(marker + '@@RESULT@@'.length));
}
const dir = mkdtempSync(join(tmpdir(), 'mmusic-native-storage-'));
const db = join(dir, 'kv.json');
const stored = () => JSON.parse(readFileSync(db, 'utf8'));

try {
  // 1. Fresh install, then the user changes things.
  const first = run(db, 'first');
  check('fresh install: Russian, no artist, no draft', first.start.locale === 'ru' && first.start.artist === null && first.start.draftTrack === null);
  check('fresh install: regular promo wallet is 0 сом', first.start.wallet === 0);

  // 2. Restart: everything is back.
  const second = run(db, 'restart');
  const s = second.start;
  check('restart: app language kept (en)', s.locale === 'en');
  check('restart: profile avatar kept', s.avatar === 'file:///avatar.jpg');
  check('restart: liked track kept', s.liked.includes('horizon'));
  check('restart: library save, unsave and genre follow kept', s.librarySaved.includes('artist:arlo') && !s.librarySaved.includes('artist:kaelen') && s.followedGenres.includes('synthwave'));
  check('restart: created playlist kept', s.playlists.includes('Road Trip'));
  check('restart: audio settings kept (lossless off, crossfade 7 s)', s.lossless === false && s.crossfadeSec === 7);
  check('restart: donation history kept', s.donations[0] === 'kaelen:250');
  check('restart: notifications stay read', s.unread === 0);
  check('restart: artist profile kept', s.artist === 'Own Artist');
  check('restart: campaign draft kept', s.draftTrack === 'horizon' && s.draftPackage === 'spotlight');
  check('restart: regular wallet still 0 сом', s.wallet === 0);
  check('restart: nothing was written before storage was set up', second.diagnostics.queued === 0 && second.diagnostics.misuse.length === 0);

  // 3. Account switching, then another restart.
  const sw = run(db, 'switch');
  check('demo login: shows Solaris Echo with the demo balance', sw.duringDemoLogin.artist === 'Solaris Echo' && sw.duringDemoLogin.wallet === 3850 && sw.duringDemoLogin.demoActive);
  check('after demo login: own account back, wallet 0', sw.afterDemoLogin.artist === 'Own Artist' && sw.afterDemoLogin.draftTrack === 'horizon' && sw.afterDemoLogin.wallet === 0);
  check('Demo Artist preview: Solaris Echo, then own account back', sw.duringPreview.artist === 'Solaris Echo' && sw.afterPreview.artist === 'Own Artist' && sw.afterPreview.wallet === 0);
  const keys = Object.keys(stored());
  const accountKey = keys.find((k) => k.startsWith('mmusic:artist-account:') && !k.endsWith(':invalid'));
  const account = JSON.parse(stored()[accountKey]);
  check('regular account never saved demo data', account.artist?.name === 'Own Artist' && !JSON.stringify(account).includes('Solaris Echo'));
  check('demo data lives under its own key', keys.includes('mmusic:demo-artist'));
  const third = run(db, 'restart');
  check('restart after switching: own account and draft intact', third.start.artist === 'Own Artist' && third.start.draftTrack === 'horizon' && third.start.wallet === 0 && !third.start.demoActive);
  check('restart after switching: listener data intact', third.start.locale === 'en' && third.start.playlists.includes('Road Trip') && third.start.donations[0] === 'kaelen:250');

  // 4. Hydration order: a change before hydrating never replaces saved data.
  const early = run(db, 'set-before-hydrate');
  check('saved library survives a change made before hydration', early.start.followedGenres.includes('synthwave') && !early.start.followedGenres.includes('before-hydration'));
  check('saved settings survive a change made before hydration', early.start.lossless === false);

  // 5. Corrupted data: defaults for that store, the others still load, no crash.
  const all = stored();
  const libraryKey = Object.keys(all).find((k) => k.startsWith('mmusic:library:'));
  const settingsKey = Object.keys(all).find((k) => k.startsWith('mmusic:settings:'));
  writeFileSync(db, JSON.stringify({ ...all, [libraryKey]: '{not json', [settingsKey]: JSON.stringify({ state: { lossless: 'yes', crossfadeSec: 7 }, version: 0 }), [accountKey]: '{"v":999}' }));
  const corrupt = run(db, 'restart');
  check('corrupted library: defaults, no crash', !corrupt.start.followedGenres.includes('synthwave'));
  check('corrupted settings field: only that field falls back', corrupt.start.lossless === true && corrupt.start.crossfadeSec === 7);
  check('corrupted artist account: not loaded, kept aside (:invalid)', corrupt.start.artist === null && Object.keys(stored()).some((k) => k.endsWith(':invalid')));
  check('corrupted data does not affect other stores', corrupt.start.locale === 'en' && corrupt.start.playlists.includes('Road Trip'));

  // 6. Storage unavailable (SQLite cannot be opened): the app runs, nothing persists.
  const before = readFileSync(db, 'utf8');
  const none = run(join(dir, 'missing.json'), 'unavailable');
  check('no storage: starts with defaults, no crash', none.start.locale === 'ru' && none.start.artist === null && none.diagnostics.state === 'unavailable');
  check('no storage: nothing written anywhere', !existsSync(join(dir, 'missing.json')) && readFileSync(db, 'utf8') === before);

  // 7. Website mode (persistence not enabled): native-only state is never stored or read.
  const webDb = join(dir, 'web.json');
  run(webDb, 'website');
  const webKeys = existsSync(webDb) ? Object.keys(JSON.parse(readFileSync(webDb, 'utf8'))) : [];
  check('website mode: the same user actions store no library, playlists, settings, donation or notification keys', !webKeys.some((k) => /mmusic:(library|playlists|settings|support-history|notifications):/.test(k)));
  check('website mode: what the website already keeps is still stored (language)', webKeys.includes('mmusic:locale'));
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} native-persistence check(s) failed.`);
  process.exit(1);
}
console.log('\nAll native-persistence checks passed.');
