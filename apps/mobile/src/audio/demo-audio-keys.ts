import type { TrackId } from '@/mocks';

/** `audio:<path under assets/audio>` — resolved by the Expo app through the
 * `require()` table in src/audio/demo-sources.ts, and later by the Vite
 * website from the same files. */
export type AudioKey = `audio:${string}`;

/**
 * Which demo recording each catalog track plays (W2.4a). Pure data (no
 * `require`), so it can be shared with the website and imported by tests.
 * Keys must match `demoAudioCredits` (src/audio/demo-audio.ts); every key
 * needs an entry in `audioSources` — scripts/verify-asset-keys.mjs checks both.
 */
export const demoAudioKeys: Partial<Record<TrackId, AudioKey>> = {
  'midnight-mirage': 'audio:chill-wave.mp3',
  horizon: 'audio:floating-cities.mp3',
  'vapor-trails': 'audio:windswept.mp3',
  'abyssal-bloom': 'audio:reminiscing.mp3',
  'tape-saturation-4': 'audio:comfortable-mystery.mp3',
  'abyssal-bloom-feat': 'audio:eternity.mp3',
  'obsidian-frequencies': 'audio:spellbound.mp3',
  'ember-tide': 'audio:one-sly-move.mp3',
  'resonant-field-reprise': 'audio:deliberate-thought.mp3',
  'nebula-dreams-t1': 'audio:equatorial-complex.mp3',
  'lost-frequencies-t1': 'audio:late-night-radio.mp3',
  'velvet-skyline-t1': 'audio:airship-serenity.mp3',
  'chronos-echoes-t1': 'audio:winter-reflections.mp3',
  // First real Kyrgyz audio import — rights NOT confirmed, local/dev testing
  // only (assets/audio/kyrgyz/CREDITS.md). Not CC BY 4.0 / Kevin MacLeod like
  // the entries above; see the Kyrgyz-catalog id list further down this file.
  // __DEV__ only: production/Vercel builds never bundle or serve this file.
  ...(typeof __DEV__ !== 'undefined' && __DEV__ ? { oshondo: 'audio:kyrgyz/oshondo.mp3' as const } : {}),
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
  'taimuras', 'ananayyn', 'eto-lyubov', 'issyk-kulskiy-vaib',
  // __DEV__ only (rights not confirmed): absent from production builds.
  ...(typeof __DEV__ !== 'undefined' && __DEV__ ? ['oshondo'] : []),
];
