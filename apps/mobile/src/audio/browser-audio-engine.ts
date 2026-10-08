import type { TrackId } from '@/mocks';

import { STATUS_INTERVAL_MS, type AudioEngine, type EngineStatus } from './audio-engine';

/**
 * 0.01 s of silence. Played once on the first user gesture so iOS Safari
 * treats the element as user-activated; afterwards it may start later tracks
 * on its own (after a swipe's settle delay, at the end of a track).
 */
export const SILENT_SRC =
  'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

/** Events that count as a user activation for media playback in Safari and Chrome. */
const GESTURE_EVENTS = ['touchend', 'pointerup', 'click', 'keydown'] as const;
const MEDIA_EVENTS = ['loadedmetadata', 'durationchange', 'timeupdate', 'playing', 'pause', 'waiting', 'canplay', 'seeked', 'ended', 'error'] as const;

/** The part of HTMLAudioElement the engine uses (a fake one in tests). */
export type MediaLike = EventTarget & {
  src: string;
  currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  readonly ended: boolean;
  readonly readyState: number;
  readonly error: { code: number } | null;
  loop: boolean;
  preload: string;
  play(): Promise<void> | void;
  pause(): void;
};

type Timers = {
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
};

export type BrowserAudioEngineOptions = {
  /** The one element used for every track — never replaced. */
  media: MediaLike;
  /** Track → audio URL; undefined for tracks without audio. */
  resolveUri: (trackId: TrackId) => string | undefined;
  /** Where user gestures are observed (window in the app). */
  gestureTarget: EventTarget;
  timers?: Timers;
};

export type BrowserAudioEngine = AudioEngine & { dispose(): void };

const defaultTimers: Timers = {
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
};

/**
 * Browser audio for the website (W2). Unlike expo-audio's web player, which
 * creates a new <audio> per track, this keeps ONE element for the whole
 * session: iOS Safari only lets an element play without a fresh tap once that
 * element has been started by a user gesture, so swapping `src` on the same
 * element keeps swipes, auto-advance and lock-screen controls working.
 *
 * - The first gesture anywhere "unlocks" the element with a silent clip,
 *   unless a real track is already loaded (then the app's own Play does it).
 * - A play() refused by the autoplay policy is reported as `blocked` (the
 *   player shows paused, one tap resumes) — not as an error.
 * - A play() interrupted by a newer load/pause (AbortError) is ignored.
 */
export function createBrowserAudioEngine({ media, resolveUri, gestureTarget, timers = defaultTimers }: BrowserAudioEngineOptions): BrowserAudioEngine {
  const listeners = new Set<(status: EngineStatus) => void>();
  let buffering = false;
  let ticker: unknown;
  let unlocked = false;

  media.preload = 'auto';

  const isSilent = () => media.src === SILENT_SRC;

  function snapshot(extra: Partial<EngineStatus> = {}): EngineStatus {
    const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
    return {
      currentTime: Number.isFinite(media.currentTime) ? media.currentTime : 0,
      duration,
      playing: !media.paused && !media.ended,
      isBuffering: buffering,
      isLoaded: media.readyState >= 1,
      didJustFinish: false,
      error: null,
      ...extra,
    };
  }

  function emit(extra?: Partial<EngineStatus>) {
    // The unlock clip is an implementation detail: the app never hears about it.
    if (isSilent()) return;
    const status = snapshot(extra);
    listeners.forEach((listener) => listener(status));
  }

  function startTicker() {
    if (ticker === undefined) ticker = timers.setInterval(() => emit(), STATUS_INTERVAL_MS);
  }
  function stopTicker() {
    if (ticker !== undefined) timers.clearInterval(ticker);
    ticker = undefined;
  }

  function onMediaEvent(event: Event) {
    switch (event.type) {
      case 'playing':
        buffering = false;
        if (!isSilent()) markUnlocked();
        startTicker();
        emit();
        return;
      case 'waiting':
        buffering = true;
        emit();
        return;
      case 'canplay':
        buffering = false;
        emit();
        return;
      case 'pause':
        stopTicker();
        emit();
        return;
      case 'ended':
        stopTicker();
        emit({ didJustFinish: true, playing: false });
        return;
      case 'error':
        stopTicker();
        emit({ playing: false, error: `Playback error (code ${media.error?.code ?? 0})` });
        return;
      default:
        emit();
    }
  }
  MEDIA_EVENTS.forEach((name) => media.addEventListener(name, onMediaEvent));

  function onGesture() {
    if (unlocked) return;
    // A real track is loaded: the app's own Play/swipe in this gesture will start it.
    if (media.src && !isSilent()) return;
    media.src = SILENT_SRC;
    let started: Promise<void> | void;
    try {
      started = media.play();
    } catch {
      return;
    }
    Promise.resolve(started)
      .then(() => {
        markUnlocked();
        // The app may already have swapped in a real track during this gesture.
        if (isSilent()) media.pause();
      })
      .catch(() => {});
  }
  function markUnlocked() {
    if (unlocked) return;
    unlocked = true;
    GESTURE_EVENTS.forEach((name) => gestureTarget.removeEventListener(name, onGesture, true));
  }
  GESTURE_EVENTS.forEach((name) => gestureTarget.addEventListener(name, onGesture, true));

  function onPlayRefused(error: unknown) {
    const name = (error as { name?: string } | null)?.name;
    // A newer load() or pause() won the race: nothing to report.
    if (name === 'AbortError') return;
    if (name === 'NotAllowedError') {
      emit({ playing: false, blocked: true });
      return;
    }
    emit({ playing: false, error: 'Playback could not start' });
  }

  return {
    load(trackId) {
      const uri = resolveUri(trackId);
      if (uri === undefined) return;
      stopTicker();
      buffering = false;
      media.src = uri;
    },
    play() {
      try {
        const result = media.play();
        if (result) result.catch(onPlayRefused);
      } catch (error) {
        onPlayRefused(error);
      }
    },
    pause() {
      media.pause();
    },
    seekTo(sec) {
      if (Number.isFinite(sec)) media.currentTime = Math.max(0, sec);
    },
    setLoop(on) {
      media.loop = on;
    },
    onStatus(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      stopTicker();
      MEDIA_EVENTS.forEach((name) => media.removeEventListener(name, onMediaEvent));
      GESTURE_EVENTS.forEach((name) => gestureTarget.removeEventListener(name, onGesture, true));
      listeners.clear();
    },
  };
}
