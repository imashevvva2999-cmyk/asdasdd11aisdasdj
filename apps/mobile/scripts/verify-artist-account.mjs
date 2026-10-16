#!/usr/bin/env node
/**
 * Regular artist account persistence (src/state/artist-account-persistence.ts):
 * save/restore across a simulated reload, corrupted/outdated data, isolation
 * from the Solaris demo account and the Guest Preview, nothing sensitive stored.
 * Usage: npx tsx scripts/verify-artist-account.mjs
 */
import { exitGuestPreview, enterGuestPreview, useDemoSessionStore } from '../src/state/demo-session-store.ts';
import {
  artistAccountKey,
  readArtistAccount,
  restoreArtistAccount,
  setArtistAccountStorage,
  setArtistPersistencePaused,
} from '../src/state/artist-account-persistence.ts';
import { useArtistStore } from '../src/state/artist-store.ts';
import { useCampaignStore } from '../src/state/campaign-store.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

const mem = new Map();
const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
setArtistAccountStorage(storage);
const KEY = artistAccountKey();
// Simulates a page reload: the in-memory app state disappears without being
// saved (a freshly loaded page has not restored yet, so it cannot write).
const emptyApp = () => {
  setArtistPersistencePaused(true);
  useArtistStore.setState({ artist: undefined, entries: [] });
  useCampaignStore.setState({ trackId: undefined, packageId: undefined, launched: [], description: '', targetGenreIds: [] });
  setArtistPersistencePaused(false);
};

// Start-up with nothing saved: no write happens before restore, nothing breaks.
useArtistStore.setState({ entries: [] });
check('nothing is written before the saved state is restored', !mem.has(KEY));
restoreArtistAccount();
check('restoring with nothing saved is a no-op', useArtistStore.getState().artist === undefined);

// Build a regular artist account.
useArtistStore.getState().createArtistProfile({ stageName: 'Aibek Beats', genre: 'Electronic' });
const draft = useArtistStore.getState().saveDraft({ title: 'Neon Steppe', genre: 'Electronic' });
await useArtistStore.getState().publishTrack(draft.track.id);
useArtistStore.getState().saveDraft({ title: 'Work In Progress' });
useCampaignStore.getState().startCampaign(draft.track.id);
useCampaignStore.getState().selectPackage('pro');
useCampaignStore.getState().toggleGenre('electronic-dance');
useCampaignStore.getState().setDescription('First single');
await useCampaignStore.getState().confirm(765);
useCampaignStore.getState().togglePause(useCampaignStore.getState().launched[0].id);
const saved = readArtistAccount();
check('artist profile is saved', saved?.artist?.name === 'Aibek Beats');
check('track metadata and release status are saved', saved?.entries.some((e) => e.track.title === 'Neon Steppe' && e.status === 'published' && e.genre === 'Electronic') && saved?.entries.some((e) => e.status === 'draft'));
check('campaign history and pause state are saved', saved?.campaign.launched.length === 1 && saved?.campaign.pausedCampaignIds.length === 1);
const raw = mem.get(KEY);
check('nothing sensitive is stored (no password/hash/token/payment error)', !/password|sha256|token|secret|paymentError/i.test(raw));

// Simulated reload: in-memory app state gone, restore from storage.
emptyApp();
restoreArtistAccount();
check('reload restores the artist', useArtistStore.getState().artist?.name === 'Aibek Beats');
check('reload restores tracks and statuses', useArtistStore.getState().entries.length === 2 && useArtistStore.getState().entries.some((e) => e.status === 'published'));
check('reload restores campaign history', useCampaignStore.getState().launched.length === 1 && useCampaignStore.getState().launched[0].description === 'First single');

// A campaign draft survives reload too.
useCampaignStore.getState().startCampaign(draft.track.id);
useCampaignStore.getState().selectPackage('boost');
useCampaignStore.getState().setDescription('Draft note');
emptyApp();
restoreArtistAccount();
check('reload restores the campaign draft', useCampaignStore.getState().packageId === 'boost' && useCampaignStore.getState().description === 'Draft note');

// Switching to the Solaris demo never writes into the regular account; signing out restores it.
const beforeDemo = mem.get(KEY);
useDemoSessionStore.getState().signIn();
check('demo account is shown while signed in', useArtistStore.getState().artist?.name === 'Solaris Echo');
useCampaignStore.getState().setDescription('demo edit');
check('demo data is never written into the regular account', mem.get(KEY) === beforeDemo);
useDemoSessionStore.getState().signOut();
check('demo sign-out restores the regular artist', useArtistStore.getState().artist?.name === 'Aibek Beats' && useCampaignStore.getState().description === 'Draft note');

// Guest Preview: isolated, read-only, regular account restored afterwards.
enterGuestPreview();
check('guest preview shows the demo fixture', useArtistStore.getState().artist?.name === 'Solaris Echo');
check('guest preview never touches the regular account', mem.get(KEY) === beforeDemo);
exitGuestPreview();
check('leaving the guest preview restores the regular artist', useArtistStore.getState().artist?.name === 'Aibek Beats');

// Corrupted and outdated data are set aside, not loaded, and nothing crashes.
mem.set(KEY, '{not json');
check('corrupted JSON is not loaded', readArtistAccount() === undefined);
check('corrupted data is moved aside, not lost', mem.get(`${KEY}:invalid`) === '{not json' && !mem.has(KEY));
mem.set(KEY, JSON.stringify({ v: 0, entries: [] }));
check('outdated version is not loaded', readArtistAccount() === undefined);
mem.set(KEY, JSON.stringify({ v: 1, savedAt: 'x', entries: [{ nope: true }], campaign: {} }));
check('wrong shape is not loaded', readArtistAccount() === undefined);
emptyApp();
restoreArtistAccount();
check('restore after corrupted data leaves an empty account (no crash)', useArtistStore.getState().artist === undefined);

// A payment in progress is never persisted as in progress.
useArtistStore.getState().createArtistProfile({ stageName: 'Second' });
useCampaignStore.setState({ stage: 'processing' });
check('an in-flight payment is saved as confirming, not processing', readArtistAccount()?.campaign.stage === 'confirming');

if (failures > 0) {
  console.error(`\n${failures} artist-account check(s) failed.`);
  process.exit(1);
}
console.log('\nAll artist-account checks passed.');
