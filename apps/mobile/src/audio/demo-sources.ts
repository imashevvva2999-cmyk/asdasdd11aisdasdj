import type { AudioSource } from 'expo-audio';

import type { TrackId } from '@/mocks';

/**
 * Demo audio files (CC BY 4.0, Kevin MacLeod — see assets/audio/CREDITS.md and
 * src/audio/demo-audio.ts). Keys must match `demoAudioCredits`. Shared by the
 * native (expo-audio) and browser engines.
 */
export const DEMO_SOURCES: Partial<Record<TrackId, AudioSource>> = {
  'midnight-mirage': require('../../assets/audio/chill-wave.mp3'),
  horizon: require('../../assets/audio/floating-cities.mp3'),
};
