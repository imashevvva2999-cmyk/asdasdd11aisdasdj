#!/usr/bin/env node
/**
 * Фаза 4, Batch 4 — frontend test for the local Artist state/state machine
 * (src/state/artist-store.ts): profile creation, draft tracks, and the
 * Draft → Uploading → Processing → Published / Error status progression,
 * plus the upsert into the shared mocks/artists.ts and mocks/tracks.ts
 * catalogs that makes a published track resolvable from the public Artist
 * Profile and playable via the shared player store. Exercises the real
 * store module directly via `tsx` (which resolves the `@/*` tsconfig path
 * alias) — the same practical approach as scripts/verify-player-store.mjs
 * and scripts/verify-support-store.mjs, since no Jest/RNTL is configured
 * here.
 *
 * Usage: npx tsx scripts/verify-artist-store.mjs (or `pnpm run verify:artist-store`)
 */
import { getArtistById, getTrackById } from '../src/mocks/index.ts';
import { useArtistStore } from '../src/state/artist-store.ts';

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

// --- Artist profile creation ---------------------------------------------

check('no local artist profile before setup', useArtistStore.getState().artist === undefined);
check('the artist id is not yet resolvable in the shared catalog', getArtistById('me') === undefined);

const artist = useArtistStore.getState().createArtistProfile({
  stageName: 'Nova Tide',
  genre: 'Synthwave',
  bio: 'A test artist profile.',
  location: 'Bishkek',
});
check('createArtistProfile() returns the new artist', artist.name === 'Nova Tide');
check("createArtistProfile() sets the store's current artist", useArtistStore.getState().artist?.name === 'Nova Tide');
check('createArtistProfile() upserts into the shared artists catalog (same entity as S-08)', getArtistById('me')?.name === 'Nova Tide');
check('a brand-new artist starts with 0 listeners (honest mock data, not invented stats)', getArtistById('me')?.monthlyListeners === 0);

// --- Draft track + publish success flow ----------------------------------

const draftEntry = useArtistStore.getState().saveDraft({ title: 'First Light', genre: 'Synthwave' });
check('saveDraft() creates an entry in the draft status', draftEntry.status === 'draft');
check('saveDraft() does not yet insert the track into the shared catalog', getTrackById(draftEntry.track.id) === undefined);
check('the draft entry is tracked in the store', useArtistStore.getState().entries.some((e) => e.track.id === draftEntry.track.id));

await useArtistStore.getState().publishTrack(draftEntry.track.id);
const publishedEntry = useArtistStore.getState().entries.find((e) => e.track.id === draftEntry.track.id);
check('publishTrack() advances the entry to published', publishedEntry?.status === 'published');
check('publishTrack() inserts the track into the shared catalog (same Track entity, no duplicate model)', getTrackById(draftEntry.track.id)?.title === 'First Light');
check("publishTrack() links the track into the artist's popularTrackIds", getArtistById('me')?.popularTrackIds?.includes(draftEntry.track.id));

// --- Error / retry demo path ----------------------------------------------

const errorEntry = useArtistStore.getState().saveDraft({ title: 'Static Bloom' });
useArtistStore.getState().simulateError(errorEntry.track.id);
check('simulateError() marks the entry as errored', useArtistStore.getState().entries.find((e) => e.track.id === errorEntry.track.id)?.status === 'error');
check('an errored track is not inserted into the shared catalog', getTrackById(errorEntry.track.id) === undefined);

await useArtistStore.getState().retryPublish(errorEntry.track.id);
check('retryPublish() recovers to published', useArtistStore.getState().entries.find((e) => e.track.id === errorEntry.track.id)?.status === 'published');
check('retryPublish() inserts the recovered track into the shared catalog', getTrackById(errorEntry.track.id)?.title === 'Static Bloom');

if (failures > 0) {
  console.error(`\n${failures} artist-store check(s) failed.`);
  process.exit(1);
}

console.log('\nAll artist-store checks passed.');
