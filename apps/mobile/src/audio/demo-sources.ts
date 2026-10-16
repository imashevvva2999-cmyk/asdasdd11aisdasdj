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
  'vapor-trails': require('../../assets/audio/windswept.mp3'),
  'abyssal-bloom': require('../../assets/audio/reminiscing.mp3'),
  'tape-saturation-4': require('../../assets/audio/comfortable-mystery.mp3'),
  'abyssal-bloom-feat': require('../../assets/audio/eternity.mp3'),
  'obsidian-frequencies': require('../../assets/audio/spellbound.mp3'),
  'ember-tide': require('../../assets/audio/one-sly-move.mp3'),
  'resonant-field-reprise': require('../../assets/audio/deliberate-thought.mp3'),
  'nebula-dreams-t1': require('../../assets/audio/equatorial-complex.mp3'),
  'lost-frequencies-t1': require('../../assets/audio/late-night-radio.mp3'),
  'velvet-skyline-t1': require('../../assets/audio/airship-serenity.mp3'),
  'chronos-echoes-t1': require('../../assets/audio/winter-reflections.mp3'),
  // First real Kyrgyz audio import — rights NOT confirmed, local/dev testing
  // only (assets/audio/kyrgyz/CREDITS.md). Not CC BY 4.0 / Kevin MacLeod like
  // the entries above; see the Kyrgyz-catalog id list further down this file.
  // __DEV__ only: production/Vercel builds never bundle or serve this file.
  ...(typeof __DEV__ === 'undefined' || __DEV__ ? { oshondo: require('../../assets/audio/kyrgyz/oshondo.mp3') } : {}),
};

/**
 * Catalog tracks with no demo audio yet, by design (docs/superpowers/plans/
 * 2026-10-12-kyrgyz-track-catalog.md) — real licensed audio pending, see
 * assets/audio/kyrgyz/PENDING.md. Read by
 * scripts/verify-demo-audio-coverage.mjs to exempt these ids from its
 * "every catalog track has demo audio" check without weakening it for
 * every other track.
 */
export const PENDING_AUDIO_TRACK_IDS: TrackId[] = [
  'kyrgyzstanym', 'muras', 'ene-til', 'alai', 'kachan-kaitat', 'jazym-kelchi',
  'kyrgyz-biyi', 'ne-segodnya', 'kirgiz-jeri', 'erke-kyz', 'chopo-choor-fantasy',
  'kyrgyzstanym-remix', 'jashtyk-kez', 'kambarkan', 'esimde', 'kyrgyz-bala',
  'taimuras', 'ananayyn', 'eto-lyubov', 'issyk-kulskiy-vaib',
];

/**
 * Every Kyrgyz-catalog track id, whether its audio is still pending (the 20
 * above) or already wired (e.g. 'oshondo'). Real Kyrgyz recordings are
 * licensed/credited separately from the CC BY 4.0 Kevin MacLeod demo
 * recordings used elsewhere — scripts/verify-demo-audio-coverage.mjs reads
 * this to exempt these ids from that license-specific check (PENDING.md
 * step 7) without weakening it for any other track.
 */
export const KYRGYZ_TRACK_IDS: TrackId[] = [
  'kyrgyzstanym', 'muras', 'ene-til', 'alai', 'kachan-kaitat', 'jazym-kelchi',
  'kyrgyz-biyi', 'ne-segodnya', 'kirgiz-jeri', 'erke-kyz', 'chopo-choor-fantasy',
  'kyrgyzstanym-remix', 'jashtyk-kez', 'kambarkan', 'esimde', 'kyrgyz-bala',
  'taimuras', 'ananayyn', 'eto-lyubov', 'issyk-kulskiy-vaib', 'oshondo',
];
