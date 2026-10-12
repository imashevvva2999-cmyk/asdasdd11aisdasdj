#!/usr/bin/env node
/**
 * Dev-only demo-stat seeding on the Artist store (docs/superpowers/plans/
 * 2026-10-12-artist-dashboard-demo-seed.md, Task 2). Exercises the real
 * store module directly via tsx, same approach as
 * scripts/verify-artist-store.mjs. Usage:
 * npx tsx scripts/verify-artist-store-demo-seed.mjs
 */
import { getArtistById } from '../src/mocks/index.ts';
import { useArtistStore } from '../src/state/artist-store.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

// --- No-op before a profile exists ---------------------------------------
useArtistStore.getState().seedDemoStats(12_000, 45_000);
check('seedDemoStats() is a no-op when no artist profile exists yet (artist stays undefined)', useArtistStore.getState().artist === undefined);
check('seedDemoStats() is a no-op when no artist profile exists yet (demoStreams stays undefined)', useArtistStore.getState().demoStreams === undefined);

// --- Sets values once a profile exists ------------------------------------
useArtistStore.getState().createArtistProfile({ stageName: 'Demo Artist' });
useArtistStore.getState().seedDemoStats(12_000, 45_000);
check('seedDemoStats() sets demoListeners on state (dashboard-only)', useArtistStore.getState().demoListeners === 12_000);
check('seedDemoStats() sets demoStreams on state', useArtistStore.getState().demoStreams === 45_000);
// Demo figures must never leak into the public Artist Profile (S-08).
check('seedDemoStats() leaves the artist record\'s real monthlyListeners (0) untouched', useArtistStore.getState().artist?.monthlyListeners === 0);
check('the shared catalog artist (public profile) still shows the real 0', getArtistById('me')?.monthlyListeners === 0);

// --- Idempotent on a second call (absolute, not incrementing) -------------
useArtistStore.getState().seedDemoStats(12_000, 45_000);
check('calling seedDemoStats() twice sets an absolute value, not an increment', useArtistStore.getState().demoStreams === 45_000);

if (failures > 0) {
  console.error(`\n${failures} artist-store-demo-seed check(s) failed.`);
  process.exit(1);
}
console.log('\nAll artist-store-demo-seed checks passed.');
