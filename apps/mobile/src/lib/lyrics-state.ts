import { isDemoAudioInstrumental } from '@/audio/demo-audio';
import { getLyricsForTrack, type LyricLine, type LyricsSource, type TrackId, type TrackLyrics } from '@/mocks';

/**
 * Which lyrics a track may show (W3 spec §2.4, extended by Lyrics Demo
 * Experience): only text from the catalog data, never invented text, sample
 * text always labelled as such (decision OQ-W3-1), and — critically — gated
 * on whether the *recording that's actually playing* has vocals at all, not
 * on whether mock/catalog lyrics data happens to exist for that track id. An
 * instrumental demo recording always shows the "Lyrics unavailable for demo
 * audio" state, even for a track that has sample lyrics kept around for
 * future development (see src/mocks/lyrics.ts).
 */
export type LyricsState =
  | { kind: 'synced'; source: LyricsSource; lines: LyricLine[] }
  | { kind: 'demo-instrumental' }
  | { kind: 'none' };

export const LYRICS_EMPTY = {
  'demo-instrumental': { title: 'Lyrics unavailable for demo audio', hint: 'This demo recording is instrumental.' },
  none: { title: 'Lyrics unavailable', hint: "Synchronized lyrics haven't been added for this track yet." },
} as const;

/** Shown wherever sample lyrics appear, so they never pass for the official text. */
export const SAMPLE_LYRICS_NOTE = {
  label: 'Sample lyrics',
  hint: 'Placeholder text for the demo, not the official lyrics.',
} as const;

/**
 * Pure core (Lyrics Demo Experience): gated on whether the *currently playing
 * recording itself* has no vocals, not on whether the catalog track happens
 * to have lyrics data. An instrumental recording never shows lyrics even if
 * sample/catalog lines exist for that track id — once a future recording is
 * marked vocal (`isInstrumental: false`) and has real lyrics, this is what
 * lets them appear.
 */
export function lyricsState(isInstrumental: boolean, lyrics: TrackLyrics | undefined): LyricsState {
  if (isInstrumental) return { kind: 'demo-instrumental' };
  if (lyrics && lyrics.lines.length > 0) return { kind: 'synced', source: lyrics.source, lines: lyrics.lines };
  return { kind: 'none' };
}

export function lyricsStateFor(trackId: TrackId | undefined): LyricsState {
  if (!trackId) return { kind: 'none' };
  return lyricsState(isDemoAudioInstrumental(trackId), getLyricsForTrack(trackId));
}

/**
 * The single lyric line under Now Playing's controls: only real lyrics data,
 * labelled by source, and nothing before the first line's timestamp (a line is
 * never shown ahead of its time).
 */
export function lyricPreview(state: LyricsState, progressMs: number): { label: string; text: string } | undefined {
  if (state.kind !== 'synced') return undefined;
  const index = activeLineIndex(state.lines, progressMs);
  if (index < 0) return undefined;
  return { label: state.source === 'sample' ? SAMPLE_LYRICS_NOTE.label : 'Lyrics', text: state.lines[index].text };
}

/** The line whose timestamp was passed last; -1 before the first one. */
export function activeLineIndex(lines: LyricLine[], progressMs: number): number {
  let index = -1;
  for (let i = 0; i < lines.length && lines[i].timeMs <= progressMs; i += 1) index = i;
  return index;
}
