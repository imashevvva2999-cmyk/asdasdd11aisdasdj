export type Bands = { bass: number; mid: number; high: number };

export const ZERO_BANDS: Bands = { bass: 0, mid: 0, high: 0 };

/** Exponential smoothing toward a target, frame-rate independent. */
export function smoothTowards(current: number, target: number, dt: number, tauMs: number): number {
  const k = 1 - Math.exp(-dt / tauMs);
  return current + (target - current) * k;
}

function binAverage(data: Uint8Array, from: number, to: number): number {
  let sum = 0;
  let n = 0;
  for (let i = Math.max(0, from); i < Math.min(data.length, to); i += 1) {
    sum += data[i]!;
    n += 1;
  }
  return n === 0 ? 0 : sum / n / 255;
}

/** Bass (20-160Hz) / mid (160Hz-2kHz) / high (2kHz-8kHz) averages, 0..1, from one AnalyserNode frame. */
export function bandsFromFrequencyData(data: Uint8Array, sampleRate: number, fftSize: number): Bands {
  const binHz = sampleRate / fftSize;
  const binFor = (hz: number) => Math.round(hz / binHz);
  return {
    bass: binAverage(data, binFor(20), binFor(160)),
    mid: binAverage(data, binFor(160), binFor(2000)),
    high: binAverage(data, binFor(2000), binFor(8000)),
  };
}

export function smoothBands(current: Bands, target: Bands, dt: number, tauMs = 120): Bands {
  return {
    bass: smoothTowards(current.bass, target.bass, dt, tauMs),
    mid: smoothTowards(current.mid, target.mid, dt, tauMs),
    high: smoothTowards(current.high, target.high, dt, tauMs),
  };
}
