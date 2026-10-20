/**
 * Metro defines __DEV__ (true in development, false in production builds). Core treats it as possibly
 * missing — any other bundler, e.g. Vite, gets production-safe content unless it defines __DEV__ itself —
 * so every development-only entry is written `typeof __DEV__ !== 'undefined' && __DEV__` (fail-closed).
 * Only core's own typecheck reads this file; inside the app, React Native's declaration applies.
 */
declare const __DEV__: boolean | undefined;

/**
 * Timers exist in every runtime core targets (React Native, browsers, Node), but core's typecheck loads no DOM or
 * Node types — so only what core uses is declared, deliberately minimal (stores simulate processing delays; the player defers swipe audio starts).
 */
declare function setTimeout(handler: (...args: never[]) => void, timeout?: number): unknown;
declare function clearTimeout(handle: unknown): void;
// The browser audio engine's status ticker.
declare function setInterval(handler: () => void, timeout?: number): unknown;
declare function clearInterval(handle: unknown): void;

/**
 * Event types, only as far as audio/browser-audio-engine.ts uses them: it is handed an <audio> element and a gesture
 * target by the app (it never touches the DOM itself), listens with add/removeEventListener (optionally in the
 * capture phase) and reads `event.type`. Type declarations only — no runtime code.
 */
interface Event {
  readonly type: string;
}
interface EventTarget {
  addEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean): void;
  removeEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean): void;
}
