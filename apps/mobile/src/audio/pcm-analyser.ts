import type { AnalyserLike } from './audio-analyser-core';

// The website's Web Audio AnalyserNode settings (audio-analyser.web.ts), so the
// shared band math reads the same spectrum on both platforms.
const FFT_SIZE = 2048;
const SMOOTHING = 0.6;
const MIN_DB = -100;
const MAX_DB = -30;
/** expo-audio's samples carry no rate; the bundled demo tracks are 44.1 kHz. */
export const SAMPLE_RATE = 44100;

export type PcmAnalyser = AnalyserLike & { push(frames: ArrayLike<number>): void };

/**
 * Web Audio's AnalyserNode rebuilt over raw PCM: the latest `FFT_SIZE` samples,
 * Blackman window, |FFT| / N, time smoothing, then decibels mapped to bytes.
 */
export function createPcmAnalyser(): PcmAnalyser {
  const n = FFT_SIZE;
  const half = n / 2;
  const ring = new Float32Array(n);
  let write = 0;

  const blackman = new Float32Array(n);
  for (let i = 0; i < n; i += 1) blackman[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / n) + 0.08 * Math.cos((4 * Math.PI * i) / n);

  const bits = Math.log2(n);
  const reverse = new Uint32Array(n);
  for (let i = 0; i < n; i += 1) {
    let r = 0;
    for (let b = 0; b < bits; b += 1) r = (r << 1) | ((i >> b) & 1);
    reverse[i] = r;
  }
  const cos = new Float32Array(half);
  const sin = new Float32Array(half);
  for (let i = 0; i < half; i += 1) {
    cos[i] = Math.cos((-2 * Math.PI * i) / n);
    sin[i] = Math.sin((-2 * Math.PI * i) / n);
  }

  const re = new Float32Array(n);
  const im = new Float32Array(n);
  const smoothed = new Float32Array(half);

  return {
    fftSize: n,
    frequencyBinCount: half,
    push(frames) {
      for (let i = 0; i < frames.length; i += 1) {
        ring[write] = frames[i] ?? 0;
        write = (write + 1) % n;
      }
    },
    getByteFrequencyData(out) {
      for (let i = 0; i < n; i += 1) {
        const j = reverse[i] ?? 0;
        re[j] = (ring[(write + i) % n] ?? 0) * (blackman[i] ?? 0);
        im[j] = 0;
      }
      for (let size = 2; size <= n; size <<= 1) {
        const step = n / size;
        const h = size >> 1;
        for (let start = 0; start < n; start += size) {
          for (let k = 0; k < h; k += 1) {
            const a = start + k;
            const b = a + h;
            const wr = cos[k * step] ?? 1;
            const wi = sin[k * step] ?? 0;
            const rb = re[b] ?? 0;
            const ib = im[b] ?? 0;
            const ra = re[a] ?? 0;
            const ia = im[a] ?? 0;
            const tr = rb * wr - ib * wi;
            const ti = rb * wi + ib * wr;
            re[b] = ra - tr;
            im[b] = ia - ti;
            re[a] = ra + tr;
            im[a] = ia + ti;
          }
        }
      }
      const count = Math.min(out.length, half);
      for (let k = 0; k < count; k += 1) {
        const magnitude = Math.hypot(re[k] ?? 0, im[k] ?? 0) / n;
        const value = SMOOTHING * (smoothed[k] ?? 0) + (1 - SMOOTHING) * magnitude;
        smoothed[k] = value;
        const db = value > 0 ? 20 * Math.log10(value) : -Infinity;
        out[k] = Math.max(0, Math.min(255, Math.floor(((db - MIN_DB) / (MAX_DB - MIN_DB)) * 255)));
      }
    },
  };
}
