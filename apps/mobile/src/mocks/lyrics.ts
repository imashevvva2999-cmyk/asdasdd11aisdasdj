export type LyricLine = { timeMs: number; text: string };

/**
 * Where a track's lyrics come from:
 * - `catalog` — the song's official lyrics, supplied with the catalog (none yet);
 * - `sample` — placeholder text written for the demo, only ever shown labelled
 *   "Sample lyrics" (W3 spec §2.4, decision OQ-W3-1).
 */
export type LyricsSource = 'catalog' | 'sample';
export type TrackLyrics = { source: LyricsSource; lines: LyricLine[] };

/** Synced lyrics keyed by track ID (docs/screens.md §3.9 S-16). Only Midnight
 * Mirage has (sample) lyrics, kept to demonstrate synchronized highlighting;
 * others fall back to the documented empty states rather than invented text. */
export const lyricsByTrackId: Record<string, TrackLyrics> = {
  'midnight-mirage': {
    source: 'sample',
    lines: [
      { timeMs: 0, text: 'City lights dissolve to static' },
      { timeMs: 8000, text: 'Chasing echoes down the wire' },
      { timeMs: 16000, text: 'Midnight mirage, I keep walking' },
      { timeMs: 24000, text: 'Through a haze of amber fire' },
      { timeMs: 32000, text: 'Every signal fades to silence' },
      { timeMs: 40000, text: 'Every shadow finds its frame' },
      { timeMs: 48000, text: 'Midnight mirage, call your name' },
      { timeMs: 56000, text: 'Nothing here is what it seems' },
      { timeMs: 64000, text: 'Floating on these borrowed dreams' },
      { timeMs: 72000, text: 'Midnight mirage, fading out' },
      { timeMs: 80000, text: 'Let the static have the doubt' },
    ],
  },
};

export function getLyricsForTrack(trackId: string): TrackLyrics | undefined {
  return lyricsByTrackId[trackId];
}
