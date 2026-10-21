import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readFileSync } from 'node:fs';

import { demoAudioKeys } from '@mmusic/core/audio/demo-audio-keys';

import { audioCreditFor, audioForSubmission, clampSeek, DEMO_AUDIO, formatClock, previewErrorKind, SUBMISSION_AUDIO } from '../src/domain/audio.ts';
import { armSeed } from '../src/domain/seed.ts';

void test('audit: the nine fictional track submissions have no audio file, so none is mapped', () => {
  const fictional = armSeed().submissions.filter((s) => s.kind === 'track' && !s.catalogTrackId);
  assert.equal(fictional.length, 9);
  for (const track of fictional) assert.equal(audioForSubmission(track.id, 'track'), undefined, track.id);
});

void test('the playable demo submission plays exactly the recording its catalog track already plays', () => {
  assert.deepEqual(Object.keys(DEMO_AUDIO), ['sub-demo-horizon']);
  const seed = armSeed().submissions;
  for (const [id, audio] of Object.entries(DEMO_AUDIO)) {
    const sub = seed.find((s) => s.id === id)!;
    assert.ok(sub.catalogTrackId, `${id} is built on a catalog track`);
    assert.equal(demoAudioKeys[sub.catalogTrackId as keyof typeof demoAudioKeys], `audio:${audio.file}`, `${id}: same file as the catalog`);
    assert.ok(audio.url.endsWith(`/mobile/assets/audio/${audio.file}`), audio.url);
    assert.ok(audioForSubmission(id, 'track'));
    assert.match(audioCreditFor(id) ?? '', /Kevin MacLeod.*CC BY 4\.0/);
  }
});

void test('the demo submission repeats the catalog track metadata and the recording is credited as such', () => {
  const sub = armSeed().submissions.find((s) => s.id === 'sub-demo-horizon')!;
  const catalogLine = readFileSync(new URL('../../../core/mocks/tracks.ts', import.meta.url), 'utf8').split('\n').find((l) => l.includes("id: 'horizon'"))!;
  assert.match(catalogLine, new RegExp(`title: '${sub.title}', artistId: '${sub.artistId}'.*durationSec: ${sub.durationSec}\\b`));
  const credits = readFileSync(new URL('../../mobile/assets/audio/CREDITS.md', import.meta.url), 'utf8');
  assert.match(credits, /`floating-cities\.mp3` \(5,892,113 bytes\) \| Horizon \| "Floating Cities"/);
  assert.equal(readFileSync(new URL('../../mobile/assets/audio/floating-cities.mp3', import.meta.url)).length, 5_892_113);
});

void test('the audio table only ever maps existing track submissions (never releases or unknown ids)', () => {
  const tracks = new Set(armSeed().submissions.filter((s) => s.kind === 'track').map((s) => s.id));
  for (const id of Object.keys(SUBMISSION_AUDIO)) assert.ok(tracks.has(id), `${id} is not a track submission`);
});

void test('releases never get a preview, even with the same id', () => {
  assert.equal(audioForSubmission('sub-r1', 'release'), undefined);
});

void test('clock formatting', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(59.9), '0:59');
  assert.equal(formatClock(213), '3:33');
  assert.equal(formatClock(3725), '1:02:05');
  assert.equal(formatClock(Number.NaN), '0:00');
  assert.equal(formatClock(Number.POSITIVE_INFINITY), '0:00');
  assert.equal(formatClock(-5), '0:00');
});

void test('media errors map to what the UI says', () => {
  assert.equal(previewErrorKind({ mediaErrorCode: 4 }), 'unsupported');
  assert.equal(previewErrorKind({ mediaErrorCode: 2 }), 'network');
  assert.equal(previewErrorKind({ mediaErrorCode: 3 }), 'decode');
  assert.equal(previewErrorKind({ mediaErrorCode: 1 }), 'unknown');
  assert.equal(previewErrorKind({ playErrorName: 'NotAllowedError', mediaErrorCode: 4 }), 'blocked');
  assert.equal(previewErrorKind({ playErrorName: 'NotSupportedError' }), 'unsupported');
  assert.equal(previewErrorKind({}), 'unknown');
});

void test('seek is clamped to the media length', () => {
  assert.equal(clampSeek(50, 200), 50);
  assert.equal(clampSeek(-3, 200), 0);
  assert.equal(clampSeek(250, 200), 200);
  assert.equal(clampSeek(10, Number.NaN), 0);
  assert.equal(clampSeek(10, 0), 0);
});
