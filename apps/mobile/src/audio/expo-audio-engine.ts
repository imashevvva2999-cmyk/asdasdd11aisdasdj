import { createAudioPlayer, setAudioModeAsync, type AudioStatus } from 'expo-audio';

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

/** One app-wide expo-audio player: it must outlive every screen, so it is
 * created with `createAudioPlayer` (not the hook) and never released. */
function createExpoAudioEngine(): AudioEngine {
  const player = createAudioPlayer(null, { updateInterval: STATUS_INTERVAL_MS });
  return {
    load: (trackId) => {
      const source = DEMO_SOURCES[trackId];
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

/** Native (iOS/Android) audio. The website uses platform-audio.web.ts instead. Called once from the root layout. */
export function startAudio() {
  if (started) return;
  started = true;
  // iOS: keep playing when the ring/silent switch is on.
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  bindAudioEngine(createExpoAudioEngine());
}
