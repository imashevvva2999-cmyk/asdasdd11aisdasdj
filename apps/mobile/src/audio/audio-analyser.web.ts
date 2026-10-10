import { createAudioAnalyser } from './audio-analyser-core';

type Analyser = ReturnType<typeof createAudioAnalyser>;

let singleton: Analyser | null = null;
let ctx: AudioContext | null = null;
/** Setup is attempted at most once — a failure (no element yet, no AudioContext) must never be retried every animation frame. */
let attempted = false;

const GESTURE_EVENTS = ['touchend', 'pointerup', 'click', 'keydown'] as const;

/**
 * Lazily taps a Web Audio AnalyserNode onto the single shared #mmusic-audio
 * element (platform-audio.web.ts) — never a second player. `createMediaElementSource`
 * can only be called once per element ever, so this is a module-level singleton
 * that survives component remounts (Home's banner mounting/unmounting on tab
 * switches must not try to re-tap the element).
 */
export function getSharedAnalyser(): Analyser | null {
  if (singleton) return singleton;
  if (attempted) return null;
  if (typeof window === 'undefined') return null;
  const media = document.getElementById('mmusic-audio');
  if (!(media instanceof HTMLAudioElement)) return null;
  attempted = true;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    const source = ctx.createMediaElementSource(media);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    // Safari mutes the element's own output once it feeds a MediaElementAudioSourceNode
    // unless that graph also reaches destination.
    analyser.connect(ctx.destination);
    singleton = createAudioAnalyser({ analyser, sampleRate: ctx.sampleRate });
    const resume = () => void ctx?.resume();
    GESTURE_EVENTS.forEach((name) => window.addEventListener(name, resume, true));
  } catch (err) {
    console.warn('[audio-analyser]', err);
    ctx?.close();
    ctx = null;
    return null;
  }
  return singleton;
}

/**
 * Creates the AudioContext inside the current call stack instead of waiting
 * for the particle wave's next animation frame — Safari only allows an
 * AudioContext to start unsuspended when creation happens synchronously
 * inside a user gesture. Called once, on the very first tap/click/key
 * anywhere on the page (mirrors browser-audio-engine.ts's own unlock
 * pattern), so creation always lands inside a trusted gesture.
 */
function primeOnFirstGesture() {
  if (typeof window === 'undefined') return;
  const prime = () => {
    getSharedAnalyser();
    GESTURE_EVENTS.forEach((name) => window.removeEventListener(name, prime, true));
  };
  GESTURE_EVENTS.forEach((name) => window.addEventListener(name, prime, true));
}
primeOnFirstGesture();
