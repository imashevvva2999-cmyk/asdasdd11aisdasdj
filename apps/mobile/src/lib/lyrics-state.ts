import { hasDemoAudio } from '@/audio/demo-audio';
import { getLyricsForTrack, type LyricLine, type LyricsSource, type TrackId } from '@/mocks';

/**
 * Which lyrics a track may show (W3 spec §2.4): only text from the catalog
 * data, never invented text, and sample text always labelled as such
 * (decision OQ-W3-1). Demo recordings are instrumental, so a demo track
 * without lyrics says so instead of the generic message.
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

export function lyricsStateFor(trackId: TrackId | undefined): LyricsState {
  if (!trackId) return { kind: 'none' };
  const lyrics = getLyricsForTrack(trackId);
  if (lyrics && lyrics.lines.length > 0) return { kind: 'synced', source: lyrics.source, lines: lyrics.lines };
  return hasDemoAudio(trackId) ? { kind: 'demo-instrumental' } : { kind: 'none' };
}

/** The line whose timestamp was passed last; -1 before the first one. */
export function activeLineIndex(lines: LyricLine[], progressMs: number): number {
  let index = -1;
  for (let i = 0; i < lines.length && lines[i].timeMs <= progressMs; i += 1) index = i;
  return index;
}
