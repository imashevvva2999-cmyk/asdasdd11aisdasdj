/**
 * `true` on the Vite dev server, `false` in production builds (vite.config.ts `define`). Read only by
 * @mmusic/core's fail-closed development gates (`typeof __DEV__ !== 'undefined' && __DEV__`); ARM code uses
 * `import.meta.env.DEV` instead.
 */
declare const __DEV__: boolean | undefined;
