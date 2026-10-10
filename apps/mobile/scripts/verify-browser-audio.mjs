#!/usr/bin/env node
/**
 * Tests for the browser audio engine and Media Session binding (W2 —
 * docs/superpowers/specs/2026-10-08-web-w1-w2.md). Runs in Node with a fake
 * media element that behaves like HTMLAudioElement where the engine depends on
 * it (events, play() promise, autoplay refusal), so the Safari-critical rules
 * are checked without a browser:
 * - ONE element is reused for every track (iOS unlocks a single element);
 * - the first user gesture unlocks it without touching a real track;
 * - an autoplay refusal is reported as `blocked`, not as an error.
 *
 * Usage: npx tsx scripts/verify-browser-audio.mjs
 */
import { SILENT_SRC, createBrowserAudioEngine } from '../src/audio/browser-audio-engine.ts';
import { bindMediaSession } from '../src/audio/media-session.ts';
import { bindAudioEngine, usePlayerStore } from '../src/state/player-store.ts';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Just enough of HTMLAudioElement. `allowPlay` decides the autoplay policy. */
class FakeMedia extends EventTarget {
  src = '';
  currentTime = 0;
  duration = NaN;
  paused = true;
  ended = false;
  loop = false;
  muted = false;
  preload = '';
  readyState = 0;
  error = null;
  allowPlay = () => true;
  playCalls = 0;
  play() {
    this.playCalls += 1;
    if (!this.allowPlay()) {
      const err = new Error('play() is not allowed');
      err.name = 'NotAllowedError';
      return Promise.reject(err);
    }
    this.paused = false;
    queueMicrotask(() => this.dispatchEvent(new Event('playing')));
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
  load() {}
  fire(name) {
    this.dispatchEvent(new Event(name));
  }
}

function makeTimers() {
  const timers = new Map();
  let id = 0;
  return {
    setInterval: (fn) => {
      id += 1;
      timers.set(id, fn);
      return id;
    },
    clearInterval: (handle) => timers.delete(handle),
    runAll: () => [...timers.values()].forEach((fn) => fn()),
    count: () => timers.size,
  };
}

const URIS = { 'midnight-mirage': '/audio/chill-wave.mp3', horizon: '/audio/floating-cities.mp3' };

// ---- One element for every track.
{
  const media = new FakeMedia();
  const gestures = new EventTarget();
  const engine = createBrowserAudioEngine({ media, resolveUri: (id) => URIS[id], gestureTarget: gestures, timers: makeTimers() });
  engine.load('midnight-mirage');
  check('load() points the single element at the track', media.src === '/audio/chill-wave.mp3');
  engine.load('horizon');
  check('the next track reuses the same element (src swapped, no new element)', media.src === '/audio/floating-cities.mp3');
  engine.load('qa-no-audio-fixture'); // Demo Audio Experience gives every real catalog track audio — a synthetic id exercises this path.
  check('a track without audio leaves the element alone', media.src === '/audio/floating-cities.mp3');
  engine.dispose();
}

// ---- Unlock on the first user gesture (iOS Safari).
{
  const media = new FakeMedia();
  const gestures = new EventTarget();
  const engine = createBrowserAudioEngine({ media, resolveUri: (id) => URIS[id], gestureTarget: gestures, timers: makeTimers() });
  gestures.dispatchEvent(new Event('touchend'));
  check('first gesture with nothing loaded plays the silent clip on the element', media.src === SILENT_SRC && media.playCalls === 1);
  await tick();
  check('…and pauses it again right away', media.paused === true);
  gestures.dispatchEvent(new Event('click'));
  check('later gestures do nothing (listeners removed once unlocked)', media.playCalls === 1);
  engine.dispose();
}
{
  const media = new FakeMedia();
  const gestures = new EventTarget();
  const engine = createBrowserAudioEngine({ media, resolveUri: (id) => URIS[id], gestureTarget: gestures, timers: makeTimers() });
  const statuses = [];
  engine.onStatus((s) => statuses.push({ ...s, src: media.src }));
  // Same click: the unlock listener runs first, then the app starts a real track.
  gestures.dispatchEvent(new Event('click'));
  engine.load('horizon');
  engine.play();
  await tick();
  await tick();
  check('a real track started in the same gesture is not paused by the unlock', media.src === '/audio/floating-cities.mp3' && media.paused === false);
  check('the silent clip never reaches the app as a status', !statuses.some((s) => s.src === SILENT_SRC));
  engine.dispose();
}
{
  const media = new FakeMedia();
  const gestures = new EventTarget();
  const engine = createBrowserAudioEngine({ media, resolveUri: (id) => URIS[id], gestureTarget: gestures, timers: makeTimers() });
  engine.load('horizon');
  gestures.dispatchEvent(new Event('click'));
  check('a gesture while a track is loaded does not replace it with the silent clip', media.src === '/audio/floating-cities.mp3' && media.playCalls === 0);
  engine.dispose();
}

// ---- Autoplay refusal and interrupted play().
{
  const media = new FakeMedia();
  media.allowPlay = () => false;
  const engine = createBrowserAudioEngine({ media, resolveUri: (id) => URIS[id], gestureTarget: new EventTarget(), timers: makeTimers() });
  const statuses = [];
  engine.onStatus((s) => statuses.push(s));
  engine.load('horizon');
  engine.play();
  await tick();
  const last = statuses.at(-1);
  check('NotAllowedError → status blocked, not playing, no error', last?.blocked === true && last.playing === false && last.error === null);
  engine.dispose();
}
{
  const media = new FakeMedia();
  media.play = function () {
    const err = new Error('The play() request was interrupted by a call to pause().');
    err.name = 'AbortError';
    return Promise.reject(err);
  };
  const engine = createBrowserAudioEngine({ media, resolveUri: (id) => URIS[id], gestureTarget: new EventTarget(), timers: makeTimers() });
  const statuses = [];
  engine.onStatus((s) => statuses.push(s));
  engine.load('horizon');
  engine.play();
  await tick();
  check('AbortError (a newer load/pause won) is ignored — no error, no blocked', statuses.every((s) => !s.error && !s.blocked));
  engine.dispose();
}

// ---- Status reporting.
{
  const media = new FakeMedia();
  const timers = makeTimers();
  const engine = createBrowserAudioEngine({ media, resolveUri: (id) => URIS[id], gestureTarget: new EventTarget(), timers });
  const statuses = [];
  engine.onStatus((s) => statuses.push(s));
  engine.load('horizon');
  media.readyState = 1;
  media.duration = 185.4;
  media.fire('loadedmetadata');
  check('metadata → loaded with the real duration', statuses.at(-1)?.isLoaded === true && statuses.at(-1)?.duration === 185.4);
  engine.play();
  await tick();
  check('playing → status playing, periodic updates start', statuses.at(-1)?.playing === true && timers.count() === 1);
  media.currentTime = 12.5;
  timers.runAll();
  check('periodic update carries the position', statuses.at(-1)?.currentTime === 12.5);
  media.fire('waiting');
  check('waiting → buffering', statuses.at(-1)?.isBuffering === true);
  media.fire('playing');
  check('playing again → not buffering', statuses.at(-1)?.isBuffering === false);
  engine.pause();
  check('pause → not playing, periodic updates stop', statuses.at(-1)?.playing === false && timers.count() === 0);
  media.paused = true;
  media.ended = true;
  media.fire('ended');
  check('ended → didJustFinish once', statuses.at(-1)?.didJustFinish === true && statuses.filter((s) => s.didJustFinish).length === 1);
  media.error = { code: 4 };
  media.fire('error');
  check('element error → error status', typeof statuses.at(-1)?.error === 'string' && statuses.at(-1).error.length > 0);
  engine.seekTo(42);
  check('seekTo sets the position', media.currentTime === 42);
  engine.setLoop(true);
  check('setLoop sets looping', media.loop === true);
  media.error = null;
  media.duration = Infinity;
  media.fire('durationchange');
  check('an unknown (streaming) duration is reported as 0, never Infinity/NaN', statuses.at(-1)?.duration === 0);
  engine.dispose();
}

// ---- Media Session (lock screen, headset, media keys).
{
  const handlers = {};
  const positions = [];
  const session = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: (name, fn) => {
      if (name === 'skipad') throw new Error('unsupported');
      handlers[name] = fn;
    },
    setPositionState: (state) => positions.push(state),
  };
  const calls = [];
  bindAudioEngine({
    load: (id) => calls.push(['load', id]),
    play: () => calls.push(['play']),
    pause: () => calls.push(['pause']),
    seekTo: (sec) => calls.push(['seekTo', sec]),
    setLoop: () => {},
    onStatus: () => () => {},
  });
  const unbind = bindMediaSession({
    session,
    store: usePlayerStore,
    createMetadata: (init) => ({ ...init }),
    resolveArtwork: (track) => (track.id === 'midnight-mirage' ? 'https://example.test/mirage.jpg' : undefined),
  });
  usePlayerStore.getState().play('midnight-mirage', ['midnight-mirage', 'horizon']);
  check('metadata shows the current track', session.metadata?.title === 'Midnight Mirage' && session.metadata?.artist === 'Solaris Echo');
  check('artwork is passed as an absolute URL', session.metadata?.artwork?.[0]?.src === 'https://example.test/mirage.jpg');
  usePlayerStore.setState({ playback: 'playing', isPlaying: true, durationSec: 200, progressSec: 30 });
  check('playbackState follows the player', session.playbackState === 'playing');
  check('position state is valid (position ≤ duration)', positions.at(-1)?.duration === 200 && positions.at(-1)?.position === 30);
  const before = positions.length;
  usePlayerStore.setState({ durationSec: undefined, progressSec: 5 });
  check('no position state without a known duration', positions.length === before);
  usePlayerStore.setState({ durationSec: 200, progressSec: 30 });
  handlers.pause?.();
  check('lock-screen Pause pauses the player', usePlayerStore.getState().isPlaying === false);
  handlers.seekto?.({ seekTime: 90 });
  check('lock-screen scrubbing seeks', calls.some((c) => c[0] === 'seekTo' && c[1] === 90));
  calls.length = 0;
  handlers.nexttrack?.();
  check('Next on the headset/lock screen goes to the next track', calls.some((c) => c[0] === 'load' && c[1] === 'horizon'));
  check('metadata follows the new track', session.metadata?.title === 'Horizon' && session.metadata?.artwork === undefined);
  check('unsupported actions do not break the binding', typeof handlers.play === 'function' && typeof handlers.previoustrack === 'function');
  unbind();
  check('unbinding clears the handlers and metadata', handlers.play === null && session.metadata === null);
}

if (failures > 0) {
  console.error(`\n${failures} browser-audio check(s) failed.`);
  process.exit(1);
}
console.log('\nAll browser-audio checks passed.');
