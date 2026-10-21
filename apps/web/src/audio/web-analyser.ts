import { createAudioAnalyser } from '@mmusic/core/audio/audio-analyser-core';

type Analyser = ReturnType<typeof createAudioAnalyser>;
type CapturableAudio = HTMLAudioElement & { captureStream?: () => MediaStream };

let singleton: Analyser | null = null;
/** Set-up is attempted at most once — an unsupported browser must not retry every animation frame. */
let attempted = false;

const GESTURE_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

/**
 * Frequency analysis of the website's single <audio id="mmusic-audio"> for the particle wave — the reactive half of
 * the app's audio/audio-analyser.web.ts, but deliberately NOT its routing.
 *
 * The app taps the element with createMediaElementSource(), which permanently re-routes its sound through Web Audio:
 * while the AudioContext is suspended (no gesture yet, iOS backgrounding / lock screen) playback goes silent. Here the
 * element is only copied with HTMLMediaElement.captureStream() into an AnalyserNode that is never connected to the
 * speakers, so the element keeps playing through its own output and analysis can never mute or stop playback.
 *
 * captureStream() exists in Chromium browsers (Chrome, Edge, Android). Safari (incl. every iPhone browser) and
 * Firefox (only the muting mozCaptureStream) return null here — the wave then animates without beat reaction.
 * One analyser per page, kept for the session (the element itself lives for the whole session too).
 */
export function getWebAnalyser(): Analyser | null {
  if (singleton) return singleton;
  if (attempted || typeof window === 'undefined') return null;
  const media = document.getElementById('mmusic-audio') as CapturableAudio | null;
  if (!media) return null; // not created yet — try again on a later frame
  attempted = true;
  if (typeof media.captureStream !== 'function' || typeof AudioContext === 'undefined') return null;

  let ctx: AudioContext | null = null;
  try {
    ctx = new AudioContext();
    const context = ctx;
    const node = context.createAnalyser();
    node.fftSize = 2048;
    node.smoothingTimeConstant = 0.6;
    const stream = media.captureStream();
    let source: MediaStreamAudioSourceNode | null = null;
    // Each new src adds a new captured track (Chrome keeps the old, now silent one in the stream): follow the newest
    // and stop the superseded copies (stopping a captured copy never affects the element's own playback).
    const attach = () => {
      source?.disconnect();
      source = null;
      const tracks = stream.getAudioTracks();
      const track = tracks[tracks.length - 1];
      tracks.slice(0, -1).forEach((old) => {
        old.stop();
        stream.removeTrack(old);
      });
      if (track) {
        source = context.createMediaStreamSource(new MediaStream([track]));
        source.connect(node); // analysis only — never connected to context.destination
      }
    };
    stream.addEventListener('addtrack', attach);
    stream.addEventListener('removetrack', attach);
    attach();
    // Created outside a gesture the context starts suspended; resuming only affects analysis, never playback.
    const resume = () => {
      if (context.state === 'suspended') void context.resume();
    };
    GESTURE_EVENTS.forEach((name) => window.addEventListener(name, resume, true));
    media.addEventListener('play', resume);
    singleton = createAudioAnalyser({ analyser: node, sampleRate: context.sampleRate });
    if (import.meta.env.DEV) (window as unknown as { __mmusicAnalyser?: unknown }).__mmusicAnalyser = { context, node, stream };
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[web-analyser]', err);
    void ctx?.close();
    return null;
  }
  return singleton;
}
