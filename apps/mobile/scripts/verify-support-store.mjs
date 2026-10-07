#!/usr/bin/env node
/**
 * Фаза 4, Batch 3 — frontend test for the local donation/support state
 * (src/state/support-store.ts) and the session-local playlist library
 * (src/state/playlists-store.ts). Exercises the real store modules directly
 * via `tsx` (which resolves the `@/*` tsconfig path alias) — the same
 * practical approach as scripts/verify-player-store.mjs, since no Jest/RNTL
 * is configured here. This also covers the full Support flow that the
 * static web export cannot exercise (query params aren't pre-rendered —
 * see scripts/verify-routes.mjs's comment on the S-19…S-21 entries).
 *
 * Usage: npx tsx scripts/verify-support-store.mjs (or `pnpm run verify:support-store`)
 */
import { useSupportStore } from '../src/state/support-store.ts';
import { usePlaylistsStore } from '../src/state/playlists-store.ts';

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

// --- Support / donation flow -------------------------------------------

const seedHistoryLength = useSupportStore.getState().history.length;
check('seed history has 3 completed donations', seedHistoryLength === 3);

useSupportStore.getState().startSupport('solaris-echo');
check('startSupport() sets the selected artist', useSupportStore.getState().artistId === 'solaris-echo');
check('startSupport() resets stage to selecting', useSupportStore.getState().stage === 'selecting');
check('startSupport() clears any previous amount', useSupportStore.getState().amount === undefined);

useSupportStore.getState().selectAmount(100);
check('selectAmount() sets the amount', useSupportStore.getState().amount === 100);

useSupportStore.getState().goToConfirm();
check('goToConfirm() advances the stage', useSupportStore.getState().stage === 'confirming');

await useSupportStore.getState().confirm();
check('confirm() advances the stage to success', useSupportStore.getState().stage === 'success');
check('confirm() appends exactly one history entry', useSupportStore.getState().history.length === seedHistoryLength + 1);

const newestEntry = useSupportStore.getState().history[0];
check('the new history entry records the right artist', newestEntry?.artistId === 'solaris-echo');
check('the new history entry records the right amount', newestEntry?.amount === 100);
check('the new history entry is in KGS', newestEntry?.currency === 'KGS');
check('the new history entry is completed (no fake pending/failed state invented)', newestEntry?.status === 'completed');

useSupportStore.getState().reset();
check('reset() clears the selected artist', useSupportStore.getState().artistId === undefined);
check('reset() clears the selected amount', useSupportStore.getState().amount === undefined);
check('reset() returns to the selecting stage', useSupportStore.getState().stage === 'selecting');

// confirm() is a no-op without both an artist and an amount selected (guards
// against ever recording a donation with missing data).
const historyLengthBeforeNoOp = useSupportStore.getState().history.length;
await useSupportStore.getState().confirm();
check('confirm() without an artist/amount selected does not record a donation', useSupportStore.getState().history.length === historyLengthBeforeNoOp);

// --- Session-local playlist library -------------------------------------

const seedPlaylistCount = usePlaylistsStore.getState().playlists.length;

const created = usePlaylistsStore.getState().createPlaylist({ title: 'My Late Night Mix', initialTrackId: 'ember-tide' });
check('createPlaylist() returns the new playlist with the auto-inserted track', (created.trackIds ?? []).includes('ember-tide'));
check('createPlaylist() sets trackCount from the auto-inserted track', created.trackCount === 1);
check('createPlaylist() adds the new playlist to the library', usePlaylistsStore.getState().playlists.length === seedPlaylistCount + 1);
check('the new playlist is findable by id', usePlaylistsStore.getState().getPlaylistById(created.id)?.title === 'My Late Night Mix');

usePlaylistsStore.getState().addTrackToPlaylist(created.id, 'horizon');
let updated = usePlaylistsStore.getState().getPlaylistById(created.id);
check('addTrackToPlaylist() adds a second track', (updated?.trackIds ?? []).includes('horizon'));
check('addTrackToPlaylist() updates trackCount', updated?.trackCount === 2);

usePlaylistsStore.getState().addTrackToPlaylist(created.id, 'horizon');
updated = usePlaylistsStore.getState().getPlaylistById(created.id);
check('addTrackToPlaylist() does not duplicate an already-added track', updated?.trackCount === 2);

usePlaylistsStore.getState().removeTrackFromPlaylist(created.id, 'horizon');
updated = usePlaylistsStore.getState().getPlaylistById(created.id);
check('removeTrackFromPlaylist() removes a track', !(updated?.trackIds ?? []).includes('horizon'));
check('removeTrackFromPlaylist() updates trackCount', updated?.trackCount === 1);

const emptyPlaylist = usePlaylistsStore.getState().createPlaylist({ title: 'Empty For Now' });
check('createPlaylist() without an initial track starts empty', emptyPlaylist.trackCount === 0);

if (failures > 0) {
  console.error(`\n${failures} support/playlists-store check(s) failed.`);
  process.exit(1);
}

console.log('\nAll support/playlists-store checks passed.');
