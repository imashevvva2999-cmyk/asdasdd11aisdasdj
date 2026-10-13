import type { TrackId } from '@/mocks';

export type DemoAudioCredit = {
  /** The original title of the recording that actually plays. */
  originalTitle: string;
  author: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
  /** Whether this specific recording has no vocals — gates whether lyrics can
   * ever be shown for it (Lyrics Demo Experience). Keyed to the recording
   * itself, not the catalog track, so a future vocal demo recording (or a
   * real licensed track) can be added with `false` and show real lyrics. */
  isInstrumental: boolean;
};

/**
 * Catalog tracks that play licensed demo audio (Фаза 2, approved 2026-10-08).
 * The recordings are not the catalog songs — they are labelled "Demo audio" in
 * the player and credited in the Demo audio sheet, as CC BY 4.0 requires.
 * Pure data (no `require`), so the player store and tests can import it; the
 * audio files themselves are wired in src/audio/demo-sources.ts.
 */
export const demoAudioCredits: Partial<Record<TrackId, DemoAudioCredit>> = {
  'midnight-mirage': {
    originalTitle: 'Chill Wave',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  horizon: {
    originalTitle: 'Floating Cities',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'vapor-trails': {
    originalTitle: 'Windswept',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'abyssal-bloom': {
    originalTitle: 'Reminiscing',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'tape-saturation-4': {
    originalTitle: 'Comfortable Mystery',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'abyssal-bloom-feat': {
    originalTitle: 'Eternity',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'obsidian-frequencies': {
    originalTitle: 'Spellbound',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'ember-tide': {
    originalTitle: 'One Sly Move',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'resonant-field-reprise': {
    originalTitle: 'Deliberate Thought',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'nebula-dreams-t1': {
    originalTitle: 'Equatorial Complex',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'lost-frequencies-t1': {
    originalTitle: 'Late Night Radio',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'velvet-skyline-t1': {
    originalTitle: 'Airship Serenity',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  'chronos-echoes-t1': {
    originalTitle: 'Winter Reflections',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    isInstrumental: true,
  },
  // First real Kyrgyz audio import — NOT a CC BY 4.0 / Kevin MacLeod demo
  // recording like every entry above. Rights are not confirmed: local/dev
  // testing only, never publish or distribute (assets/audio/kyrgyz/CREDITS.md).
  // `isInstrumental: true` is a safe UI default (no lyrics text exists for
  // this track to show), not a claim about the actual recording's content.
  oshondo: {
    originalTitle: 'Ошондо (Mood Video)',
    author: 'Мирбек Атабеков',
    sourceUrl: '',
    licenseName: 'Rights not confirmed — local development testing only, not licensed for distribution',
    licenseUrl: '',
    isInstrumental: true,
  },
};

export function hasDemoAudio(trackId: TrackId | undefined): boolean {
  return trackId !== undefined && demoAudioCredits[trackId] !== undefined;
}

/** True only when the track's demo recording itself has no vocals — the
 * condition lyrics availability is gated on (Lyrics Demo Experience). */
export function isDemoAudioInstrumental(trackId: TrackId | undefined): boolean {
  if (trackId === undefined) return false;
  return demoAudioCredits[trackId]?.isInstrumental === true;
}
