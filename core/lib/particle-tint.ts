export type RGB = [number, number, number];

export function hexToRgb01(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Critically-damped colour crossfade — ~1.8s to settle at the default tauMs. */
export function lerpRgb(current: RGB, target: RGB, dt: number, tauMs = 900): RGB {
  const k = 1 - Math.exp(-dt / tauMs);
  return [current[0] + (target[0] - current[0]) * k, current[1] + (target[1] - current[1]) * k, current[2] + (target[2] - current[2]) * k];
}
