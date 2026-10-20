/**
 * Metro defines __DEV__ (true in development, false in production builds). Core treats it as possibly
 * missing — any other bundler, e.g. Vite, gets production-safe content unless it defines __DEV__ itself —
 * so every development-only entry is written `typeof __DEV__ !== 'undefined' && __DEV__` (fail-closed).
 * Only core's own typecheck reads this file; inside the app, React Native's declaration applies.
 */
declare const __DEV__: boolean | undefined;
