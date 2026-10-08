#!/usr/bin/env node
/**
 * Tests for which lyrics a track may show (src/lib/lyrics-state.ts, W3 Этап 1,
 * docs/superpowers/specs/2026-10-08-w3-floating-canvas-implementation.md §2.4):
 * only text from the catalog data, sample text always marked as sample, and
 * the approved empty state for instrumental demo audio. Real modules via `tsx`.
 *
 * Usage: npx tsx scripts/verify-lyrics-state.mjs
 */
import { hasDemoAudio } from '../src/audio/demo-audio.ts';
import { LYRICS_EMPTY, SAMPLE_LYRICS_NOTE, activeLineIndex, lyricsStateFor } from '../src/lib/lyrics-state.ts';
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

const mirage = lyricsStateFor('midnight-mirage');
check('Midnight Mirage keeps its timestamped lyrics (OQ-W3-1)', mirage.kind === 'synced' && mirage.lines.length === 11);
check('…marked as sample text, not catalog lyrics', mirage.kind === 'synced' && mirage.source === 'sample');
check('every lyrics entry in the data names its source', tracks.every((t) => {
  const lyrics = getLyricsForTrack(t.id);
  return lyrics === undefined || lyrics.source === 'catalog' || lyrics.source === 'sample';
}));
check('sample lyrics carry a visible label', SAMPLE_LYRICS_NOTE.label === 'Sample lyrics' && SAMPLE_LYRICS_NOTE.hint.length > 0);
check('demo audio without lyrics → instrumental empty state', lyricsStateFor('horizon').kind === 'demo-instrumental');
const plain = tracks.find((t) => !hasDemoAudio(t.id) && !getLyricsForTrack(t.id));
check(`no lyrics, no demo audio → none (${plain?.id})`, plain !== undefined && lyricsStateFor(plain.id).kind === 'none');
check('nothing playing → none', lyricsStateFor(undefined).kind === 'none');
check(
  'approved demo copy, verbatim',
  LYRICS_EMPTY['demo-instrumental'].title === 'Lyrics unavailable for demo audio' &&
    LYRICS_EMPTY['demo-instrumental'].hint === 'This demo recording is instrumental.',
);
check('existing empty copy kept', LYRICS_EMPTY.none.title === 'Lyrics unavailable');

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

if (failures > 0) {
  console.error(`\n${failures} lyrics-state check(s) failed.`);
  process.exit(1);
}
console.log('\nAll lyrics-state checks passed.');
