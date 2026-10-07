export type LyricLine = { timeMs: number; text: string };

/** Synced lyrics keyed by track ID (docs/screens.md §3.9 S-16). Only the
 * currently-playable mock track has lyrics; others fall back to the
 * documented "Lyrics unavailable" empty state rather than invented text. */
export const lyricsByTrackId: Record<string, LyricLine[]> = {
  'midnight-mirage': [
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
};

export function getLyricsForTrack(trackId: string): LyricLine[] | undefined {
  return lyricsByTrackId[trackId];
}
