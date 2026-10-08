import { createAudioPlayer, setAudioModeAsync, type AudioSource, type AudioStatus } from 'expo-audio';

import type { TrackId } from '@/mocks';
import { bindAudioEngine } from '@/state/player-store';

import { STATUS_INTERVAL_MS, type AudioEngine, type EngineStatus } from './audio-engine';

/**
 * Demo audio files (CC BY 4.0, Kevin MacLeod — see assets/audio/CREDITS.md and
 * src/audio/demo-audio.ts). Keys must match `demoAudioCredits`.
 */
const SOURCES: Partial<Record<TrackId, AudioSource>> = {
  'midnight-mirage': require('../../assets/audio/chill-wave.mp3'),
  horizon: require('../../assets/audio/floating-cities.mp3'),
};

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

/** One app-wide expo-audio player: it must outlive every screen, so it is
 * created with `createAudioPlayer` (not the hook) and never released. */
function createExpoAudioEngine(): AudioEngine {
  const player = createAudioPlayer(null, { updateInterval: STATUS_INTERVAL_MS });
  return {
    load: (trackId) => {
      const source = SOURCES[trackId];
      if (source !== undefined) player.replace(source);
    },
    play: () => player.play(),
    pause: () => player.pause(),
    seekTo: (sec) => {
      void player.seekTo(sec);
    },
    setLoop: (on) => {
      player.loop = on;
    },
    onStatus: (listener) => {
      const subscription = player.addListener('playbackStatusUpdate', (status) => listener(toEngineStatus(status)));
      return () => subscription.remove();
    },
  };
}

let started = false;

/** Called once on the client from the root layout (never during static web rendering). */
export function startAudio() {
  if (started) return;
  started = true;
  // iOS: keep playing when the ring/silent switch is on.
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  bindAudioEngine(createExpoAudioEngine());
}
