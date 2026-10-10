#!/usr/bin/env node
/**
 * Pure math behind the audio-reactive Late Night Flow wave (Task 1 of the
 * 2026-10-09 UI polish plan): frequency-band extraction/smoothing and the
 * colour-tint crossfade. No DOM/WebGL — real modules via tsx.
 * Usage: npx tsx scripts/verify-audio-reactive-wave.mjs
 */
import { ZERO_BANDS, bandsFromFrequencyData, smoothBands, smoothTowards } from '../src/lib/audio-bands.ts';
import { hexToRgb01, lerpRgb } from '../src/lib/particle-tint.ts';
import { createAudioAnalyser } from '../src/audio/audio-analyser-core.ts';

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`✓ OK       ${label}`);
  else {
    console.error(`✗ FAIL     ${label}`);
    failures += 1;
  }
}

check('smoothTowards moves toward the target, never overshoots', (() => {
  const a = smoothTowards(0, 1, 16, 120);
  return a > 0 && a < 1;
})());
check('smoothTowards converges after many frames', (() => {
  let v = 0;
  for (let i = 0; i < 200; i += 1) v = smoothTowards(v, 1, 16, 120);
  return v > 0.99;
})());

const fftSize = 256;
const sampleRate = 44100;
const bins = new Uint8Array(fftSize / 2);
bins.fill(0);
// At this fftSize/sampleRate, the 20-160Hz bass band maps to exactly bin 0
// (~172Hz wide) — only that bin should carry energy for a genuinely bass-only fixture.
bins[0] = 255;
const bassHeavy = bandsFromFrequencyData(bins, sampleRate, fftSize);
check('a bass-heavy spectrum reads high bass, low mid/high', bassHeavy.bass > 0.8 && bassHeavy.mid < 0.1 && bassHeavy.high < 0.1);

const silence = bandsFromFrequencyData(new Uint8Array(fftSize / 2), sampleRate, fftSize);
check('silence reads all-zero bands', silence.bass === 0 && silence.mid === 0 && silence.high === 0);

check('smoothBands decays toward zero bands (pause) and does not jump', (() => {
  let current = { bass: 1, mid: 1, high: 1 };
  current = smoothBands(current, ZERO_BANDS, 16);
  return current.bass < 1 && current.bass > 0;
})());

check('hexToRgb01 parses a known colour', (() => {
  const [r, g, b] = hexToRgb01('#ff7a59');
  return Math.round(r * 255) === 0xff && Math.round(g * 255) === 0x7a && Math.round(b * 255) === 0x59;
})());

check('lerpRgb moves toward the target without overshoot, converges', (() => {
  let c = [0, 0, 0];
  for (let i = 0; i < 400; i += 1) c = lerpRgb(c, [1, 0.5, 0], 16);
  return c[0] > 0.99 && Math.abs(c[1] - 0.5) < 0.01 && c[2] < 0.01;
})());

class FakeAnalyser {
  fftSize = 256;
  frequencyBinCount = 128;
  nextFrame = new Uint8Array(128);
  getByteFrequencyData(out) {
    out.set(this.nextFrame);
  }
}

(() => {
  const fake = new FakeAnalyser();
  const analyser = createAudioAnalyser({ analyser: fake, sampleRate: 44100 });
  fake.nextFrame.fill(255, 0, 3);
  const first = analyser.tick(0, true);
  check('createAudioAnalyser.tick smooths toward a loud bass frame, never jumps straight to 1', first.bass > 0 && first.bass < 1);
  let last = first;
  for (let i = 1; i < 60; i += 1) last = analyser.tick(i * 16, true);
  check('createAudioAnalyser.tick converges toward the sustained input', last.bass > 0.9);
  const paused = analyser.tick(last && 1000, false);
  check('createAudioAnalyser.tick decays toward zero when inactive (paused)', paused.bass < last.bass);
})();

if (failures > 0) {
  console.error(`\n${failures} audio-reactive-wave check(s) failed.`);
  process.exit(1);
}
console.log('\nAll audio-reactive-wave checks passed.');
