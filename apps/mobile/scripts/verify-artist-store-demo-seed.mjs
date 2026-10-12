#!/usr/bin/env node
/**
 * Dev-only demo-stat seeding on the Artist store (docs/superpowers/plans/
 * 2026-10-12-artist-dashboard-demo-seed.md, Task 2). Exercises the real
 * store module directly via tsx, same approach as
 * scripts/verify-artist-store.mjs. Usage:
 * npx tsx scripts/verify-artist-store-demo-seed.mjs
 */
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
check('seedDemoStats() sets monthlyListeners on the current artist', useArtistStore.getState().artist?.monthlyListeners === 12_000);
check('seedDemoStats() sets demoStreams on state', useArtistStore.getState().demoStreams === 45_000);

// --- Idempotent on a second call (absolute, not incrementing) -------------
useArtistStore.getState().seedDemoStats(12_000, 45_000);
check('calling seedDemoStats() twice sets an absolute value, not an increment', useArtistStore.getState().demoStreams === 45_000);

if (failures > 0) {
  console.error(`\n${failures} artist-store-demo-seed check(s) failed.`);
  process.exit(1);
}
console.log('\nAll artist-store-demo-seed checks passed.');
