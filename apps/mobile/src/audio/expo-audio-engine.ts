import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSample, type AudioSource, type AudioStatus } from 'expo-audio';

import { bindAudioEngine } from '@/state/player-store';

import { STATUS_INTERVAL_MS, type AudioEngine, type EngineStatus } from './audio-engine';
import { DEMO_SOURCES } from './demo-sources';

function toEngineStatus(status: AudioStatus): EngineStatus {
  return {
    currentTime: status.currentTime,
    duration: status.duration,
    playing: status.playing,
    isBuffering: status.isBuffering,
    isLoaded: status.isLoaded,
    didJustFinish: status.didJustFinish,
    error: status.error ?? null,
  };
}

let sharedPlayer: AudioPlayer | null = null;
let samplingUsers = 0;
const sampleListeners = new Set<(sample: AudioSample) => void>();

/** PCM sampling costs CPU, so it is on only while something on screen uses it. */
function applySampling() {
  const player = sharedPlayer;
  if (!player || !player.isAudioSamplingSupported) return;
  try {
    player.setAudioSamplingEnabled(samplingUsers > 0);
  } catch (err) {
    if (__DEV__) console.warn('[audio sampling]', err);
  }
}

/** Keeps audio sampling on until the returned release is called (the Particle Wave holds it while mounted). */
export function retainAudioSampling(): () => void {
  samplingUsers += 1;
  applySampling();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    samplingUsers -= 1;
    applySampling();
  };
}

/** Raw PCM samples of whatever the app is playing (only while sampling is retained and supported). */
export function onAudioSample(listener: (sample: AudioSample) => void): () => void {
  sampleListeners.add(listener);
  return () => {
    sampleListeners.delete(listener);
  };
}

/**
 * The track as a local file. Bundled `require()` audio is copied to the
 * device first (cached by content hash), so AVPlayer never streams it: in
 * development the dev server — and its tunnel — can stall or go away
 * mid-track, which fails a streamed item. In a release build the file is
 * already on the device and this resolves at once.
 */
async function toLocalSource(source: AudioSource): Promise<AudioSource> {
  if (typeof source !== 'number') return source;
  const asset = await Asset.fromModule(source).downloadAsync();
  return { uri: asset.localUri ?? asset.uri };
}

const LOAD_FAILED: Omit<EngineStatus, 'error'> = {
  currentTime: 0,
  duration: 0,
  playing: false,
  isBuffering: false,
  isLoaded: false,
  didJustFinish: false,
};

/** One app-wide expo-audio player: it must outlive every screen, so it is
 * created with `createAudioPlayer` (not the hook) and never released. */
function createExpoAudioEngine(): AudioEngine {
  const player = createAudioPlayer(null, { updateInterval: STATUS_INTERVAL_MS });
  sharedPlayer = player;
  player.addListener('audioSampleUpdate', (sample) => sampleListeners.forEach((l) => l(sample)));
  applySampling();

  const statusListeners = new Set<(status: EngineStatus) => void>();
  // While a track's file is being prepared: the latest load wins, and the
  // play/pause/seek asked for meanwhile are applied once it is in the player.
  let loadSeq = 0;
  let pending = false;
  let wantPlay = false;
  let pendingSeek: number | null = null;

  player.addListener('playbackStatusUpdate', (status) => {
    // The previous track's updates would show its position for the new one.
    if (pending) return;
    if (status.error && __DEV__) console.warn('[audio] playback error:', status.error);
    const update = toEngineStatus(status);
    statusListeners.forEach((l) => l(update));
  });

  return {
    load: (trackId) => {
      const source = DEMO_SOURCES[trackId];
      if (source === undefined) return;
      const seq = ++loadSeq;
      pending = true;
      pendingSeek = null;
      player.pause();
      toLocalSource(source).then(
        (local) => {
          if (seq !== loadSeq) return;
          pending = false;
          player.replace(local);
          // Re-applied per source: replacing the item may reset the sampling tap.
          applySampling();
          if (pendingSeek !== null) void player.seekTo(pendingSeek);
          if (wantPlay) player.play();
        },
        (err: unknown) => {
          if (seq !== loadSeq) return;
          pending = false;
          const message = err instanceof Error ? err.message : String(err);
          if (__DEV__) console.warn(`[audio] could not load ${trackId}:`, message);
          statusListeners.forEach((l) => l({ ...LOAD_FAILED, error: message }));
        },
      );
    },
    play: () => {
      wantPlay = true;
      if (!pending) player.play();
    },
    pause: () => {
      wantPlay = false;
      player.pause();
    },
    seekTo: (sec) => {
      if (pending) pendingSeek = sec;
      else void player.seekTo(sec);
    },
    setLoop: (on) => {
      player.loop = on;
    },
    onStatus: (listener) => {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },
  };
}

let started = false;

/** Native (iOS/Android) audio. The website uses platform-audio.web.ts instead. Called once from the root layout. */
export function startAudio() {
  if (started) return;
  started = true;
  // iOS: keep playing when the ring/silent switch is on.
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  bindAudioEngine(createExpoAudioEngine());
}
