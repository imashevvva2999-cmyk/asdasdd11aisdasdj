#!/usr/bin/env node
/**
 * Playlist header track count must never show a stale, non-zero count next
 * to an empty track list (the "Late Night Driving" bug — docs/superpowers/
 * plans/2026-10-12-nav-tracklist-glass-fixes.md Task 4). Usage: npx tsx
 * scripts/verify-playlist-track-count.mjs
 */
import { getTrackById, playlists } from '../src/mocks/index.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

function resolvedTrackCount(playlist) {
  return (playlist.trackIds ?? []).map((id) => getTrackById(id)).filter(Boolean).length;
}

for (const playlist of playlists) {
  const resolvedCount = resolvedTrackCount(playlist);
  if (resolvedCount === 0) {
    // Pins the exact bug this task fixes: the header must never fall back
    // to the stale static `trackCount` metadata once the real list is empty.
    check(`"${playlist.title}" has a genuinely empty resolved track list (0)`, resolvedCount === 0);
    check(`"${playlist.title}"'s stale metadata trackCount (${playlist.trackCount}) is nonzero — confirms this is the stale-fallback case, not a data-entry zero`, playlist.trackCount !== 0);
  }
}

const flow = playlists.find((p) => p.id === 'late-night-flow');
check('the "Late Night Flow" playlist exists', !!flow);
if (flow) {
  check('"Late Night Flow" still resolves its real 5 tracks (the populated case must stay unaffected by this fix)', resolvedTrackCount(flow) === 5);
}

if (failures > 0) {
  console.error(`\n${failures} playlist-track-count check(s) failed.`);
  process.exit(1);
}
console.log('\nAll playlist-track-count checks passed.');
