import { isDemoAudioInstrumental } from '@/audio/demo-audio';
import { APP_STRINGS } from '@/lib/i18n';
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

/** Empty-state copy for a track with no lyrics to show, localized. */
export function lyricsEmptyCopy(locale: 'en' | 'ru', kind: 'demo-instrumental' | 'none'): { title: string; hint: string } {
  const s = APP_STRINGS[locale];
  return kind === 'demo-instrumental'
    ? { title: s.lyricsUnavailableDemoTitle, hint: s.lyricsUnavailableDemoHint }
    : { title: s.lyricsUnavailableTitle, hint: s.lyricsUnavailableHint };
}

/** Shown wherever sample lyrics appear, so they never pass for the official text. */
export function sampleLyricsNote(locale: 'en' | 'ru'): { label: string; hint: string } {
  const s = APP_STRINGS[locale];
  return { label: s.sampleLyricsLabel, hint: s.sampleLyricsHint };
}

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
export function lyricPreview(state: LyricsState, progressMs: number, locale: 'en' | 'ru'): { label: string; text: string } | undefined {
  if (state.kind !== 'synced') return undefined;
  const index = activeLineIndex(state.lines, progressMs);
  if (index < 0) return undefined;
  return { label: state.source === 'sample' ? sampleLyricsNote(locale).label : APP_STRINGS[locale].lyricsTab, text: state.lines[index].text };
}

/** The line whose timestamp was passed last; -1 before the first one. */
export function activeLineIndex(lines: LyricLine[], progressMs: number): number {
  let index = -1;
  for (let i = 0; i < lines.length && lines[i].timeMs <= progressMs; i += 1) index = i;
  return index;
}
