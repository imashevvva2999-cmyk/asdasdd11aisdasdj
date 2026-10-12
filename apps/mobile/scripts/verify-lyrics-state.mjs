#!/usr/bin/env node
/**
 * Tests for which lyrics a track may show (src/lib/lyrics-state.ts, W3 Этап 1,
 * docs/superpowers/specs/2026-10-08-w3-floating-canvas-implementation.md §2.4):
 * only text from the catalog data, sample text always marked as sample, and
 * the approved empty state for instrumental demo audio. Real modules via `tsx`.
 *
 * Usage: npx tsx scripts/verify-lyrics-state.mjs
 */
import { hasDemoAudio, isDemoAudioInstrumental } from '../src/audio/demo-audio.ts';
import { activeLineIndex, lyricPreview, lyricsEmptyCopy, lyricsState, lyricsStateFor, sampleLyricsNote } from '../src/lib/lyrics-state.ts';
import { getLyricsForTrack, tracks } from '../src/mocks/index.ts';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`✓ OK       ${label}`);
  } else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

// Lyrics Demo Experience: Midnight Mirage's demo recording ("Chill Wave") is
// instrumental, so it must show the instrumental empty state even though it
// still carries sample lyrics data (kept for future development, OQ-W3-1) —
// mock lyrics are never surfaced for a recording that actually has no vocals.
check('Midnight Mirage has its demo recording flagged instrumental', isDemoAudioInstrumental('midnight-mirage'));
check('…so it shows the instrumental empty state, not its sample lyrics', lyricsStateFor('midnight-mirage').kind === 'demo-instrumental');
const mirageLyrics = getLyricsForTrack('midnight-mirage');
check('…while the underlying sample lyrics data is kept, untouched, for future use (OQ-W3-1)', mirageLyrics?.source === 'sample' && mirageLyrics?.lines.length === 11);
check('every lyrics entry in the data names its source', tracks.every((t) => {
  const lyrics = getLyricsForTrack(t.id);
  return lyrics === undefined || lyrics.source === 'catalog' || lyrics.source === 'sample';
}));
check('sample lyrics carry a visible label', sampleLyricsNote('en').label === 'Sample lyrics' && sampleLyricsNote('en').hint.length > 0);
check('demo audio without lyrics → instrumental empty state', lyricsStateFor('horizon').kind === 'demo-instrumental');
check('all 13 catalog demo recordings are currently flagged instrumental', tracks.filter((t) => hasDemoAudio(t.id)).every((t) => isDemoAudioInstrumental(t.id)));

// The pure core, directly: proves a future NON-instrumental recording would
// surface real lyrics data instead of being forced into the instrumental
// state — the guarantee "Implement the condition based on the currently
// playing audio recording... so future vocal recordings can display real
// lyrics when properly available" asks for.
const fakeLyrics = { source: 'catalog', lines: [{ timeMs: 0, text: 'a real sung line' }] };
check('instrumental recording → demo-instrumental, even with lyrics data present', lyricsState(true, fakeLyrics).kind === 'demo-instrumental');
check('non-instrumental recording with lyrics data → synced, showing the real lyrics', (() => {
  const s = lyricsState(false, fakeLyrics);
  return s.kind === 'synced' && s.source === 'catalog' && s.lines[0].text === 'a real sung line';
})());
check('non-instrumental recording with no lyrics data yet → none (honestly unavailable, not mislabeled instrumental)', lyricsState(false, undefined).kind === 'none');

// Demo Audio Experience gives every real catalog track demo audio, so no
// catalog track can demonstrate "no lyrics, no demo audio" any more — a
// synthetic id (absent from both the lyrics data and demoAudioCredits)
// exercises the same lyricsStateFor() code path a real one would.
const NO_LYRICS_NO_AUDIO_ID = 'qa-no-lyrics-no-audio-fixture';
check(
  'no lyrics, no demo audio → none',
  !hasDemoAudio(NO_LYRICS_NO_AUDIO_ID) && !getLyricsForTrack(NO_LYRICS_NO_AUDIO_ID) && lyricsStateFor(NO_LYRICS_NO_AUDIO_ID).kind === 'none',
);
check('nothing playing → none', lyricsStateFor(undefined).kind === 'none');
check(
  'approved demo copy, verbatim',
  lyricsEmptyCopy('en', 'demo-instrumental').title === 'Lyrics unavailable for demo audio' &&
    lyricsEmptyCopy('en', 'demo-instrumental').hint === 'This demo recording is instrumental.',
);
check('existing empty copy kept', lyricsEmptyCopy('en', 'none').title === 'Lyrics unavailable');

const lines = [
  { timeMs: 1000, text: 'a' },
  { timeMs: 8000, text: 'b' },
  { timeMs: 16000, text: 'c' },
];
check('before the first line → -1', activeLineIndex(lines, 999) === -1);
check('exactly on a timestamp → that line', activeLineIndex(lines, 8000) === 1);
check('just before the next timestamp → previous line', activeLineIndex(lines, 15999) === 1);
check('after the last line → last', activeLineIndex(lines, 999999) === 2);
check('no lines → -1', activeLineIndex([], 5000) === -1);

// The one-line preview under Now Playing's controls.
const synced = { kind: 'synced', source: 'catalog', lines };
check('preview before the first timestamp shows nothing (no line ahead of time)', lyricPreview(synced, 500, 'en') === undefined);
check('preview shows the current line', lyricPreview(synced, 9000, 'en')?.text === 'b');
check('catalog lyrics are labelled "Lyrics"', lyricPreview(synced, 9000, 'en')?.label === 'Lyrics');
check('sample lyrics are labelled "Sample lyrics"', lyricPreview({ ...synced, source: 'sample' }, 9000, 'en')?.label === 'Sample lyrics');
check('no preview without lyrics', lyricPreview({ kind: 'demo-instrumental' }, 9000, 'en') === undefined && lyricPreview({ kind: 'none' }, 9000, 'en') === undefined);

if (failures > 0) {
  console.error(`\n${failures} lyrics-state check(s) failed.`);
  process.exit(1);
}
console.log('\nAll lyrics-state checks passed.');
