import { ZERO_BANDS, bandsFromFrequencyData, smoothBands, type Bands } from '@/lib/audio-bands';

export type AnalyserLike = {
  fftSize: number;
  frequencyBinCount: number;
  getByteFrequencyData(array: Uint8Array): void;
};

export type AudioAnalyserOptions = {
  analyser: AnalyserLike;
  sampleRate: number;
};

/**
 * Wraps a Web Audio AnalyserNode (or a fake, in tests) into smoothed
 * bass/mid/high bands. `active=false` (paused, or the track has no audio)
 * decays the bands toward zero instead of reading the frozen last frame.
 */
export function createAudioAnalyser({ analyser, sampleRate }: AudioAnalyserOptions) {
  const bins = new Uint8Array(analyser.frequencyBinCount);
  let smoothed: Bands = ZERO_BANDS;
  let lastMs = 0;

  return {
    tick(nowMs: number, active: boolean): Bands {
      const dt = lastMs === 0 ? 16 : Math.min(nowMs - lastMs, 100);
      lastMs = nowMs;
      let target: Bands = ZERO_BANDS;
      if (active) {
        analyser.getByteFrequencyData(bins);
        target = bandsFromFrequencyData(bins, sampleRate, analyser.fftSize);
      }
      smoothed = smoothBands(smoothed, target, dt);
      return smoothed;
    },
  };
}
