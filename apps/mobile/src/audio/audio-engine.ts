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
};

/**
 * What the player store needs from an audio backend. The app binds the
 * expo-audio implementation (src/audio/expo-audio-engine.ts) at startup; tests
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
