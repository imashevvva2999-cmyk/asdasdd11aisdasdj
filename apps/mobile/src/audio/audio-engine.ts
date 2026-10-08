import type { TrackId } from '@/mocks';

/** Engine status updates 4×/s — progress bars glide between them (useSmoothProgress). */
export const STATUS_INTERVAL_MS = 250;

/** The slice of expo-audio's `AudioStatus` the player store needs. */
export type EngineStatus = {
  currentTime: number;
  duration: number;
  playing: boolean;
  isBuffering: boolean;
  isLoaded: boolean;
  didJustFinish: boolean;
  error: string | null;
  /** The browser refused to start playback without a user gesture (autoplay
   * policy, e.g. iOS Safari). Not an error: the track is loaded and paused. */
  blocked?: boolean;
};

/**
 * What the player store needs from an audio backend. The app binds the
 * platform implementation at startup (src/audio/platform-audio.ts: expo-audio on
 * native, one persistent <audio> element on the website); tests
 * bind a recording engine, so the store's playback logic runs in Node without
 * a native module. Tracks are loaded by id — the engine owns the id → audio
 * file mapping, keeping `require(...mp3)` out of the store.
 */
export interface AudioEngine {
  load(trackId: TrackId): void;
  play(): void;
  pause(): void;
  seekTo(sec: number): void;
  setLoop(on: boolean): void;
  /** Subscribes to playback status updates; returns an unsubscribe function. */
  onStatus(listener: (status: EngineStatus) => void): () => void;
}

/** Used until an engine is bound (server render, tests that don't need audio). */
export const silentEngine: AudioEngine = {
  load: () => {},
  play: () => {},
  pause: () => {},
  seekTo: () => {},
  setLoop: () => {},
  onStatus: () => () => {},
};
