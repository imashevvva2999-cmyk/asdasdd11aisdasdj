import type { AudioSource } from 'expo-audio';

import type { TrackId } from '@/mocks';

import { demoAudioKeys, type AudioKey } from './demo-audio-keys';

export { KYRGYZ_TRACK_IDS, PENDING_AUDIO_TRACK_IDS } from './demo-audio-keys';

/**
 * Expo app only: the static Metro `require()` table behind the audio keys in
 * src/audio/demo-audio-keys.ts (W2.4a). Demo audio files are CC BY 4.0, Kevin
 * MacLeod — see assets/audio/CREDITS.md and src/audio/demo-audio.ts. Each key
 * is the file's path under assets/audio.
 */
export const audioSources: Partial<Record<AudioKey, AudioSource>> = {
  'audio:chill-wave.mp3': require('../../assets/audio/chill-wave.mp3'),
  'audio:floating-cities.mp3': require('../../assets/audio/floating-cities.mp3'),
  'audio:windswept.mp3': require('../../assets/audio/windswept.mp3'),
  'audio:reminiscing.mp3': require('../../assets/audio/reminiscing.mp3'),
  'audio:comfortable-mystery.mp3': require('../../assets/audio/comfortable-mystery.mp3'),
  'audio:eternity.mp3': require('../../assets/audio/eternity.mp3'),
  'audio:spellbound.mp3': require('../../assets/audio/spellbound.mp3'),
  'audio:one-sly-move.mp3': require('../../assets/audio/one-sly-move.mp3'),
  'audio:deliberate-thought.mp3': require('../../assets/audio/deliberate-thought.mp3'),
  'audio:equatorial-complex.mp3': require('../../assets/audio/equatorial-complex.mp3'),
  'audio:late-night-radio.mp3': require('../../assets/audio/late-night-radio.mp3'),
  'audio:airship-serenity.mp3': require('../../assets/audio/airship-serenity.mp3'),
  'audio:winter-reflections.mp3': require('../../assets/audio/winter-reflections.mp3'),
  // First real Kyrgyz audio import — rights NOT confirmed, local/dev testing
  // only (assets/audio/kyrgyz/CREDITS.md).
  // __DEV__ only: production/Vercel builds never bundle or serve this file.
  ...(typeof __DEV__ === 'undefined' || __DEV__ ? { 'audio:kyrgyz/oshondo.mp3': require('../../assets/audio/kyrgyz/oshondo.mp3') } : {}),
};

/** Track → bundled demo audio, shared by the native (expo-audio) and browser engines. */
export const DEMO_SOURCES: Partial<Record<TrackId, AudioSource>> = Object.fromEntries(
  Object.entries(demoAudioKeys).flatMap(([trackId, key]) => {
    const source = key === undefined ? undefined : audioSources[key];
    return source === undefined ? [] : [[trackId, source]];
  }),
);
