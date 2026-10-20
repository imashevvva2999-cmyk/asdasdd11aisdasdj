/** Pointer/touch position in [0, 1] canvas-relative space, or inactive
 * when nothing is hovering/touching — every scene's `onFrame` receives
 * this each frame so pointer and touch interaction share one code path. */
export type PointerInput = { x: number; y: number; active: boolean };
