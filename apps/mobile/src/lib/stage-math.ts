/**
 * Home stage → Now Playing in one motion (W3 spec §4 Этап 1 п. 8; storyboard
 * docs/superpowers/specs/w3-concepts/iphone/transition-storyboard.png). `p` is
 * the shared `expandProgress`: 0 = stage on Home, 1 = Now Playing.
 */
export type Rect = { x: number; y: number; width: number; height: number };

export function clamp01(v: number): number {
  'worklet';
  return Math.min(1, Math.max(0, v));
}

/** The cover between its stage and player places; springs may overshoot, so clamp. */
export function lerpRect(from: Rect, to: Rect, p: number): Rect {
  'worklet';
  const k = clamp01(p);
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
    width: from.width + (to.width - from.width) * k,
    height: from.height + (to.height - from.height) * k,
  };
}

/** Home's title, controls and shelf leave first… */
export function homeChromeOpacity(p: number): number {
  'worklet';
  return clamp01(1 - p * 3.2);
}

export function homeChromeOffset(p: number): number {
  'worklet';
  return clamp01(p) * 90;
}

/** …the player's chrome arrives late, so the two never overlap. */
export function playerChromeOpacity(p: number): number {
  'worklet';
  return clamp01(p * 2.4 - 1.3);
}

export function playerChromeOffset(p: number): number {
  'worklet';
  return (1 - clamp01(p)) * 40;
}
