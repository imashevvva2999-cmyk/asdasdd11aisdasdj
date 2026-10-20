// Import FIRST in a verify script that checks development-only catalog content
// (e.g. the dev-only Ошондо import). Metro defines __DEV__; plain Node does not,
// and the app's checks are fail-closed (`typeof __DEV__ !== 'undefined' && __DEV__`),
// so without this a script sees the production catalog.
globalThis.__DEV__ = true;
