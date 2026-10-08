import type { TrackId } from '@/mocks';

export type DemoAudioCredit = {
  /** The original title of the recording that actually plays. */
  originalTitle: string;
  author: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
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
  },
  horizon: {
    originalTitle: 'Floating Cities',
    author: 'Kevin MacLeod',
    sourceUrl: 'https://incompetech.com',
    licenseName: 'Creative Commons: By Attribution 4.0 License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
};

export function hasDemoAudio(trackId: TrackId | undefined): boolean {
  return trackId !== undefined && demoAudioCredits[trackId] !== undefined;
}
