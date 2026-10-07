#!/usr/bin/env node
/**
 * Фаза 4, Batch 2 — frontend test for the shared `usePlayerStore` Zustand store
 * (src/state/player-store.ts). No Jest/RNTL is configured in this environment, so
 * this exercises the real store module directly (via `tsx`, which resolves the
 * `@/*` tsconfig path alias) and asserts on its public API — the same practical
 * approach as scripts/verify-routes.mjs for navigation.
 *
 * Usage: npx tsx scripts/verify-player-store.mjs (or `pnpm run verify:player-store`)
 */
import { usePlayerStore, stopPlayerTicking } from '../src/state/player-store.ts';

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

// play() sets current track and queue, starts playing.
usePlayerStore.getState().play('horizon', ['midnight-mirage', 'horizon', 'obsidian-frequencies']);
check('play() sets currentTrackId to the requested track', usePlayerStore.getState().currentTrackId() === 'horizon');
check('play() sets isPlaying to true', usePlayerStore.getState().isPlaying === true);
check('play() adopts the provided queue', usePlayerStore.getState().queue.join(',') === 'midnight-mirage,horizon,obsidian-frequencies');

// togglePlayPause() / pause().
usePlayerStore.getState().togglePlayPause();
check('togglePlayPause() pauses when playing', usePlayerStore.getState().isPlaying === false);
usePlayerStore.getState().togglePlayPause();
check('togglePlayPause() resumes when paused', usePlayerStore.getState().isPlaying === true);
usePlayerStore.getState().pause();
check('pause() stops playback', usePlayerStore.getState().isPlaying === false);

// next() / previous() move through the queue.
usePlayerStore.getState().next();
check('next() advances to the following track in queue', usePlayerStore.getState().currentTrackId() === 'obsidian-frequencies');
usePlayerStore.getState().previous();
check('previous() moves back to the prior track (progress was 0)', usePlayerStore.getState().currentTrackId() === 'horizon');

// next() at end of queue without repeat stops playback.
usePlayerStore.getState().play('obsidian-frequencies', ['midnight-mirage', 'horizon', 'obsidian-frequencies']);
usePlayerStore.getState().next();
check('next() at end of queue (repeat off) stops playback', usePlayerStore.getState().isPlaying === false);
check('next() at end of queue (repeat off) keeps the last track current', usePlayerStore.getState().currentTrackId() === 'obsidian-frequencies');

// repeat 'all' wraps to the start of the queue instead of stopping.
usePlayerStore.getState().cycleRepeat(); // off -> all
check('cycleRepeat() moves off -> all', usePlayerStore.getState().repeat === 'all');
usePlayerStore.getState().play('obsidian-frequencies', ['midnight-mirage', 'horizon', 'obsidian-frequencies']);
usePlayerStore.getState().next();
check('next() with repeat=all wraps to the first track', usePlayerStore.getState().currentTrackId() === 'midnight-mirage');
usePlayerStore.getState().cycleRepeat(); // all -> one
usePlayerStore.getState().cycleRepeat(); // one -> off
check('cycleRepeat() wraps one -> off', usePlayerStore.getState().repeat === 'off');

// seekTo() clamps to the track duration.
usePlayerStore.getState().play('midnight-mirage');
const duration = usePlayerStore.getState().currentTrack()?.durationSec ?? 0;
usePlayerStore.getState().seekTo(duration + 999);
check('seekTo() clamps progress to the track duration', usePlayerStore.getState().progressSec === duration);
usePlayerStore.getState().seekTo(-50);
check('seekTo() clamps negative values to 0', usePlayerStore.getState().progressSec === 0);

// shuffle toggles.
usePlayerStore.getState().toggleShuffle();
check('toggleShuffle() enables shuffle', usePlayerStore.getState().shuffle === true);
usePlayerStore.getState().toggleShuffle();
check('toggleShuffle() disables shuffle', usePlayerStore.getState().shuffle === false);

// like/unlike — demonstrates the cross-screen shared state (e.g. Now Playing <-> Liked Songs).
const notLikedId = 'ember-tide';
check('a fresh track starts unliked', usePlayerStore.getState().isLiked(notLikedId) === false);
usePlayerStore.getState().toggleLike(notLikedId);
check('toggleLike() likes an unliked track', usePlayerStore.getState().isLiked(notLikedId) === true);
usePlayerStore.getState().toggleLike(notLikedId);
check('toggleLike() unlikes a liked track', usePlayerStore.getState().isLiked(notLikedId) === false);

// queue management — setQueue / removeFromQueue / playFromQueueIndex.
usePlayerStore.getState().setQueue(['midnight-mirage', 'horizon', 'ember-tide'], 0);
check('setQueue() replaces the queue', usePlayerStore.getState().queue.join(',') === 'midnight-mirage,horizon,ember-tide');
usePlayerStore.getState().removeFromQueue('ember-tide');
check('removeFromQueue() removes a non-current upcoming track', usePlayerStore.getState().queue.join(',') === 'midnight-mirage,horizon');
usePlayerStore.getState().playFromQueueIndex(1);
check('playFromQueueIndex() jumps to and plays the given position', usePlayerStore.getState().currentTrackId() === 'horizon' && usePlayerStore.getState().isPlaying === true);

stopPlayerTicking();

if (failures > 0) {
  console.error(`\n${failures} player-store check(s) failed.`);
  process.exit(1);
}

console.log('\nAll player-store checks passed.');
