#!/usr/bin/env node
/**
 * Tests for the shared `usePlayerStore` (src/state/player-store.ts) driving a
 * real audio engine (Фаза 2 — docs/superpowers/specs/2026-10-08-phase2-real-audio-design.md).
 * No Jest/RNTL is configured, so this exercises the real store module via `tsx`
 * and asserts on its public API. The store talks to audio through the small
 * `AudioEngine` interface; here a test engine records the commands it receives
 * and lets the test push playback-status updates, exactly as expo-audio does.
 *
 * Usage: npx tsx scripts/verify-player-store.mjs
 */
import { hasDemoAudio } from '../src/audio/demo-audio.ts';
import { getTrackById } from '../src/mocks/index.ts';
import { bindAudioEngine, playPosition, usePlayerStore } from '../src/state/player-store.ts';

let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

function createTestEngine() {
  const calls = [];
  let listener = null;
  return {
    calls,
    load: (trackId) => calls.push(['load', trackId]),
    play: () => calls.push(['play']),
    pause: () => calls.push(['pause']),
    seekTo: (sec) => calls.push(['seekTo', sec]),
    setLoop: (on) => calls.push(['setLoop', on]),
    onStatus: (cb) => {
      listener = cb;
      return () => {
        listener = null;
      };
    },
    emit: (status) =>
      listener?.({ currentTime: 0, duration: 0, playing: false, isBuffering: false, isLoaded: true, didJustFinish: false, error: null, ...status }),
    reset: () => {
      calls.length = 0;
    },
    called: (name, arg) => calls.some((c) => c[0] === name && (arg === undefined || c[1] === arg)),
  };
}

const engine = createTestEngine();
bindAudioEngine(engine);
const store = () => usePlayerStore.getState();
const QUEUE = ['midnight-mirage', 'horizon', 'obsidian-frequencies'];

// Demo audio mapping (approved: Midnight Mirage + Horizon only).
check('Midnight Mirage has demo audio', hasDemoAudio('midnight-mirage'));
check('Horizon has demo audio', hasDemoAudio('horizon'));
check('Obsidian Frequencies has no audio', !hasDemoAudio('obsidian-frequencies'));
check('catalog duration of Midnight Mirage matches its audio (4:00)', getTrackById('midnight-mirage')?.durationSec === 240);
check('catalog duration of Horizon matches its audio (3:04)', getTrackById('horizon')?.durationSec === 184);

// Initial state: nothing is playing, nothing pretends to.
check('starts idle and not playing', store().playback === 'idle' && store().isPlaying === false);

// play() a track with audio: loads it into the engine and starts it.
engine.reset();
store().play('horizon', QUEUE);
check('play() sets currentTrackId to the requested track', store().currentTrackId() === 'horizon');
check('play() adopts the provided queue', store().queue.join(',') === QUEUE.join(','));
check('play() loads that track into the engine', engine.called('load', 'horizon'));
check('play() starts the engine', engine.called('play'));
check('play() is "loading" until the engine reports playing', store().playback === 'loading' && store().isPlaying === false);

// Status while still loading (playing=false) keeps "loading" but takes the real duration.
engine.emit({ playing: false, duration: 184.2 });
check('a not-yet-playing status keeps "loading"', store().playback === 'loading');
check('duration comes from the engine', store().durationSec === 184.2);

// Engine reports playing: progress follows the engine.
engine.emit({ playing: true, currentTime: 1.5, duration: 184.2 });
check('engine "playing" status → playback "playing"', store().playback === 'playing' && store().isPlaying === true);
check('progressSec follows the engine position', store().progressSec === 1.5);

// Pause / resume.
engine.reset();
store().togglePlayPause();
check('togglePlayPause() while playing pauses the engine', engine.called('pause'));
check('togglePlayPause() while playing → "paused"', store().playback === 'paused' && store().isPlaying === false);
engine.emit({ playing: false, currentTime: 2 });
check('paused status keeps "paused" and updates position', store().playback === 'paused' && store().progressSec === 2);
engine.reset();
store().togglePlayPause();
check('resume plays the already-loaded track without reloading', engine.called('play') && !engine.called('load'));
check('resume → "playing"', store().playback === 'playing');
engine.reset();
store().pause();
check('pause() pauses the engine', engine.called('pause') && store().playback === 'paused');

// External pause (e.g. an interruption) is reflected.
store().togglePlayPause();
engine.emit({ playing: true, currentTime: 3 });
engine.emit({ playing: false, currentTime: 3 });
check('an engine-side pause shows as "paused"', store().playback === 'paused');

// Seeking.
engine.reset();
store().seekTo(42);
check('seekTo() seeks the engine', engine.called('seekTo', 42));
check('seekTo() moves progress right away', store().progressSec === 42);
store().seekTo(9999);
check('seekTo() clamps to the duration', store().progressSec === 184.2);
store().seekTo(-50);
check('seekTo() clamps negative values to 0', store().progressSec === 0);

// A track without audio: no simulated playback.
engine.reset();
store().play('obsidian-frequencies', QUEUE);
check('track without audio → "unavailable"', store().playback === 'unavailable');
check('track without audio is not loaded into the engine', !engine.called('load'));
check('track without audio stops the engine', engine.called('pause'));
check('track without audio is not "playing" and has no progress', store().isPlaying === false && store().progressSec === 0);
engine.emit({ playing: true, currentTime: 5 });
check('stale engine status cannot make it look like it plays', store().playback === 'unavailable' && store().progressSec === 0);
engine.reset();
store().togglePlayPause();
check('Play does nothing on a track without audio', !engine.called('play') && store().playback === 'unavailable');
store().seekTo(10);
check('seek does nothing on a track without audio', !engine.called('seekTo') && store().progressSec === 0);

// Next / Previous between the two demo tracks, then onto a track without audio (no auto-skip).
engine.reset();
store().play('midnight-mirage', QUEUE);
engine.emit({ playing: true, currentTime: 1 });
engine.reset();
store().next();
check('next() moves to the following track', store().currentTrackId() === 'horizon');
check('next() loads and plays it', engine.called('load', 'horizon') && engine.called('play'));
engine.emit({ playing: true, currentTime: 1 });
engine.reset();
store().next();
check('next() onto a track without audio stops there (no auto-skip)', store().currentTrackId() === 'obsidian-frequencies' && store().playback === 'unavailable');
check('next() onto a track without audio stops the sound', engine.called('pause') && !engine.called('play'));
engine.reset();
store().previous();
check('previous() from it goes back and plays Horizon', store().currentTrackId() === 'horizon' && engine.called('load', 'horizon'));
engine.emit({ playing: true, currentTime: 10 });
engine.reset();
store().previous();
check('previous() after 3 s restarts the same track', store().currentTrackId() === 'horizon' && engine.called('seekTo', 0) && !engine.called('load'));
engine.emit({ playing: true, currentTime: 1 });
engine.reset();
store().previous();
check('previous() within 3 s goes to the previous track', store().currentTrackId() === 'midnight-mirage' && engine.called('load', 'midnight-mirage'));

// Track end → next track.
store().play('midnight-mirage', ['midnight-mirage', 'horizon']);
engine.emit({ playing: true, currentTime: 239 });
engine.reset();
engine.emit({ playing: false, currentTime: 240, didJustFinish: true });
check('track end advances to the next track', store().currentTrackId() === 'horizon' && engine.called('load', 'horizon'));

// A duplicate "finished" report for the same ending must not skip another track.
store().play('midnight-mirage', ['midnight-mirage', 'horizon', 'obsidian-frequencies']);
engine.emit({ playing: true, currentTime: 239 });
engine.emit({ playing: false, currentTime: 240, didJustFinish: true });
engine.emit({ playing: false, currentTime: 240, didJustFinish: true });
check('a repeated "finished" status advances only once', store().currentTrackId() === 'horizon');
store().play('horizon', ['midnight-mirage', 'horizon']);

// End of queue with repeat off: stop on the last track.
engine.emit({ playing: true, currentTime: 183 });
engine.reset();
engine.emit({ playing: false, currentTime: 184, didJustFinish: true });
check('end of queue (repeat off) stops on the last track', store().currentTrackId() === 'horizon' && store().playback === 'paused');

// Repeat one: the engine loops; finishing never advances.
engine.reset();
store().cycleRepeat(); // off -> all
check('cycleRepeat() moves off -> all', store().repeat === 'all' && engine.called('setLoop', false));
store().cycleRepeat(); // all -> one
check('repeat one turns engine looping on', store().repeat === 'one' && engine.called('setLoop', true));
store().play('midnight-mirage', ['midnight-mirage', 'horizon']);
engine.emit({ playing: true, currentTime: 239 });
engine.reset();
engine.emit({ playing: false, currentTime: 240, didJustFinish: true });
check('repeat one: track end restarts the same track', store().currentTrackId() === 'midnight-mirage' && engine.called('seekTo', 0) && engine.called('play'));
store().cycleRepeat(); // one -> off
check('cycleRepeat() wraps one -> off and stops looping', store().repeat === 'off' && engine.called('setLoop', false));

// Repeat all wraps to the start of the queue.
store().cycleRepeat(); // off -> all
store().play('horizon', ['midnight-mirage', 'horizon']);
engine.reset();
store().next();
check('next() with repeat=all wraps to the first track', store().currentTrackId() === 'midnight-mirage' && engine.called('load', 'midnight-mirage'));
store().cycleRepeat(); // all -> one
store().cycleRepeat(); // one -> off

// Load / playback error.
store().play('horizon', QUEUE);
engine.emit({ isLoaded: false, error: 'Playback error (code 4)' });
check('engine error → "error" and not playing', store().playback === 'error' && store().isPlaying === false);
engine.reset();
store().togglePlayPause();
check('Play after an error retries by reloading the track', engine.called('load', 'horizon') && engine.called('play') && store().playback === 'loading');

// Shuffle.
store().toggleShuffle();
check('toggleShuffle() enables shuffle', store().shuffle === true);
store().toggleShuffle();
check('toggleShuffle() disables shuffle', store().shuffle === false);
const shuffleQueue = ['midnight-mirage', 'horizon'];
store().playShuffled(shuffleQueue);
check('playShuffled() enables shuffle mode', store().shuffle === true);
check('playShuffled() plays a track from the given list', shuffleQueue.includes(store().currentTrackId()));
check('playShuffled() starts the engine', store().playback === 'loading');
store().toggleShuffle();

// Likes — shared across screens.
const notLikedId = 'ember-tide';
check('a fresh track starts unliked', store().isLiked(notLikedId) === false);
store().toggleLike(notLikedId);
check('toggleLike() likes an unliked track', store().isLiked(notLikedId) === true);
store().toggleLike(notLikedId);
check('toggleLike() unlikes a liked track', store().isLiked(notLikedId) === false);

// Queue management.
store().setQueue(['midnight-mirage', 'horizon', 'ember-tide'], 0);
check('setQueue() replaces the queue', store().queue.join(',') === 'midnight-mirage,horizon,ember-tide');
store().removeFromQueue('ember-tide');
check('removeFromQueue() removes a non-current upcoming track', store().queue.join(',') === 'midnight-mirage,horizon');
engine.reset();
store().playFromQueueIndex(1);
check('playFromQueueIndex() jumps to and plays the given position', store().currentTrackId() === 'horizon' && engine.called('load', 'horizon'));

// Autoplay preference (Queue "Infinity Autoplay" toggle).
check('autoplay is off by default', store().autoplay === false);
store().toggleAutoplay();
check('toggleAutoplay() turns it on', store().autoplay === true);
store().toggleAutoplay();
check('toggleAutoplay() again turns it off', store().autoplay === false);

// ---- Play order (Шаг 1: carousel neighbours must be the tracks that really play next).
const SIX = ['midnight-mirage', 'horizon', 'obsidian-frequencies', 'ember-tide', 'vapor-trails', 'abyssal-bloom'];
store().play('midnight-mirage', SIX);
check('shuffle off: play order is the queue order', store().order.join(',') === '0,1,2,3,4,5');
check('peekNeighbors() at the start: no previous, next is the following track', store().peekNeighbors().prevId === undefined && store().peekNeighbors().nextId === 'horizon');
check('upcomingTrackIds() lists the rest of the queue in order', store().upcomingTrackIds().join(',') === SIX.slice(1).join(','));

store().toggleShuffle();
const shuffled = store().order;
check('shuffle on: play order is a permutation of the queue', [...shuffled].sort().join(',') === '0,1,2,3,4,5');
check('shuffle on: the current track stays first in the play order', shuffled[0] === 0);
let consistent = true;
for (let step = 0; step < 5; step += 1) {
  const peek = store().peekNeighbors().nextId;
  store().next();
  if (store().currentTrackId() !== peek) consistent = false;
}
check('shuffle: peekNeighbors().nextId is always the track next() plays', consistent);
check('shuffle: upcomingTrackIds() follows the play order', store().upcomingTrackIds().length === 0);
store().toggleShuffle();
check('shuffle off again restores queue order', store().order.join(',') === '0,1,2,3,4,5');

store().cycleRepeat(); // off -> all
store().playFromQueueIndex(5);
check('repeat all: the last track peeks the first as next', store().peekNeighbors().nextId === 'midnight-mirage');
store().cycleRepeat(); // all -> one
store().cycleRepeat(); // one -> off
check('repeat off: the last track has no next', store().peekNeighbors().nextId === undefined);

// ---- Swipe: the track changes at once, audio starts after a short settle (no churn on fast flicks).
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
store().play('midnight-mirage', ['midnight-mirage', 'horizon', 'obsidian-frequencies']);
engine.emit({ playing: true, currentTime: 30 });
engine.reset();
store().swipeTo(1);
check('swipeTo(1) changes the current track immediately', store().currentTrackId() === 'horizon' && store().progressSec === 0);
check('swipeTo(1) shows loading but does not load audio yet', store().playback === 'loading' && !engine.called('load'));
await wait(260);
check('after the settle delay the swiped-to track loads and plays', engine.called('load', 'horizon') && engine.called('play'));
store().swipeTo(-1);
check('swipeTo(-1) always goes to the previous track (no 3 s restart rule)', store().currentTrackId() === 'midnight-mirage');
await wait(260);

engine.reset();
store().swipeTo(1);
store().swipeTo(-1);
store().swipeTo(1);
await wait(260);
const loads = engine.calls.filter((c) => c[0] === 'load');
check('rapid swipes load only the final track, once', loads.length === 1 && loads[0][1] === 'horizon' && store().currentTrackId() === 'horizon');

engine.reset();
store().swipeTo(1);
check('swipe onto a track without audio is "unavailable" at once, nothing loads', store().playback === 'unavailable' && store().currentTrackId() === 'obsidian-frequencies');
await wait(260);
check('…and nothing loads later either', !engine.called('load'));

store().swipeTo(-1);
store().pause();
engine.reset();
await wait(260);
check('pausing during the settle delay cancels the pending start', !engine.called('load') && !engine.called('play') && store().playback === 'paused');
store().swipeTo(-1);
await wait(260);
check('swipe at the start of the queue (repeat off) does nothing', store().currentTrackId() === 'midnight-mirage');

// ---- Queue edits keep the play order consistent.
store().play('midnight-mirage', ['midnight-mirage', 'horizon', 'ember-tide']);
store().removeFromQueue('horizon');
check('removeFromQueue() keeps play order valid', store().order.join(',') === '0,1' && store().peekNeighbors().nextId === 'ember-tide');

// ---- Repeat-all wrap keeps the carousel position continuous (no 3 → 0 jump,
// which re-placed the covers a frame before the animation caught up).
store().play('midnight-mirage', ['midnight-mirage', 'horizon', 'ember-tide']);
check('play position starts at the track index', playPosition(store()) === 0);
store().cycleRepeat(); // off -> all
store().swipeTo(-1);
check('repeat all: swiping back past the start continues to -1', store().currentTrackId() === 'ember-tide' && playPosition(store()) === -1);
for (let i = 0; i < 4; i += 1) store().swipeTo(1); // -1 → 0 → 1 → 2 → past the end
check('repeat all: swiping on past the end continues (3, not 0)', store().currentTrackId() === 'midnight-mirage' && playPosition(store()) === 3);
store().next();
check('repeat all: next() also continues the position', store().currentTrackId() === 'horizon' && playPosition(store()) === 4);
store().toggleShuffle();
check('a new play order resets the position to the real index', playPosition(store()) === store().order.indexOf(store().currentIndex));
store().toggleShuffle();
store().cycleRepeat(); // all -> one
store().cycleRepeat(); // one -> off
await wait(260);

if (failures > 0) {
  console.error(`\n${failures} player-store check(s) failed.`);
  process.exit(1);
}

console.log('\nAll player-store checks passed.');
