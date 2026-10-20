import { isArtworkKey, type ArtworkKey, type LocalOrRemoteImage } from './stitch-artwork';

/**
 * Expo app only: the static Metro `require()` table behind the artwork keys
 * in src/constants/stitch-artwork.ts (W2.4a). `require()` targets must be
 * static string literals for Metro to bundle them, so every file is required
 * explicitly in this one place; each key is the file's path under
 * assets/artwork, so the Vite website can resolve the same keys from the same
 * files. scripts/verify-asset-keys.mjs checks keys, table and files agree.
 *
 * A `require()` result is taken as-is — its shape differs by platform/target:
 * a plain numeric module id on native, but on this project's web/Metro
 * config already a resolved `{ uri, width, height }` object. Re-wrapping that
 * object in a second `{ uri: ... }` (treating it like a remote-URL string)
 * breaks `<Image>` at runtime ("s?.uri?.startsWith is not a function") since
 * its `.uri` is then itself an object, not a string — `toImageSource` passes
 * an already-object value straight through instead.
 *
 * Each call is wrapped in `safeRequire` so this table can still be imported
 * by plain `tsx`/Node scripts: Node has no asset transform and throws trying
 * to `require()` a raw `.jpg` as CommonJS. Metro still finds the literal
 * string argument to the inner `require()` call for real bundling either way.
 */
function safeRequire(loadModule: () => LocalOrRemoteImage): LocalOrRemoteImage | undefined {
  try {
    return loadModule();
  } catch {
    return undefined;
  }
}

export const artworkSources: Record<ArtworkKey, LocalOrRemoteImage | undefined> = {
  'asset:albums/chronos-echoes.jpg': safeRequire(() => require('../../assets/artwork/albums/chronos-echoes.jpg')),
  'asset:albums/horizon-deluxe.jpg': safeRequire(() => require('../../assets/artwork/albums/horizon-deluxe.jpg')),
  'asset:albums/lost-frequencies.jpg': safeRequire(() => require('../../assets/artwork/albums/lost-frequencies.jpg')),
  'asset:albums/nebula-dreams.jpg': safeRequire(() => require('../../assets/artwork/albums/nebula-dreams.jpg')),
  'asset:albums/neo-classical-horizons.jpg': safeRequire(() => require('../../assets/artwork/albums/neo-classical-horizons.jpg')),
  'asset:albums/refraction-horizon.jpg': safeRequire(() => require('../../assets/artwork/albums/refraction-horizon.jpg')),
  'asset:albums/resonant-field.jpg': safeRequire(() => require('../../assets/artwork/albums/resonant-field.jpg')),
  'asset:albums/solitary-echo.jpg': safeRequire(() => require('../../assets/artwork/albums/solitary-echo.jpg')),
  'asset:albums/velvet-skyline.jpg': safeRequire(() => require('../../assets/artwork/albums/velvet-skyline.jpg')),
  'asset:artists/kaelen.jpg': safeRequire(() => require('../../assets/artwork/artists/kaelen.jpg')),
  'asset:artists/solaris-echo.jpg': safeRequire(() => require('../../assets/artwork/artists/solaris-echo.jpg')),
  'asset:foryou/after-hours.jpg': safeRequire(() => require('../../assets/artwork/foryou/after-hours.jpg')),
  'asset:foryou/chill-electronic.jpg': safeRequire(() => require('../../assets/artwork/foryou/chill-electronic.jpg')),
  'asset:foryou/deep-focus.jpg': safeRequire(() => require('../../assets/artwork/foryou/deep-focus.jpg')),
  'asset:foryou/neo-soul.jpg': safeRequire(() => require('../../assets/artwork/foryou/neo-soul.jpg')),
  'asset:foryou/synthetic-waves.jpg': safeRequire(() => require('../../assets/artwork/foryou/synthetic-waves.jpg')),
  'asset:generated/abyssal-bloom-feat.jpg': safeRequire(() => require('../../assets/artwork/generated/abyssal-bloom-feat.jpg')),
  'asset:generated/afterimage.jpg': safeRequire(() => require('../../assets/artwork/generated/afterimage.jpg')),
  'asset:generated/arlo.jpg': safeRequire(() => require('../../assets/artwork/generated/arlo.jpg')),
  'asset:generated/charts-viral.jpg': safeRequire(() => require('../../assets/artwork/generated/charts-viral.jpg')),
  'asset:generated/chill-lofi.jpg': safeRequire(() => require('../../assets/artwork/generated/chill-lofi.jpg')),
  'asset:generated/classical-film.jpg': safeRequire(() => require('../../assets/artwork/generated/classical-film.jpg')),
  'asset:generated/clover-and-the-pulse.jpg': safeRequire(() => require('../../assets/artwork/generated/clover-and-the-pulse.jpg')),
  'asset:generated/deep-focus-ambient.jpg': safeRequire(() => require('../../assets/artwork/generated/deep-focus-ambient.jpg')),
  'asset:generated/electronic-dance.jpg': safeRequire(() => require('../../assets/artwork/generated/electronic-dance.jpg')),
  'asset:generated/elena-rostova.jpg': safeRequire(() => require('../../assets/artwork/generated/elena-rostova.jpg')),
  'asset:generated/ember-tide.jpg': safeRequire(() => require('../../assets/artwork/generated/ember-tide.jpg')),
  'asset:generated/fresh-finds.jpg': safeRequire(() => require('../../assets/artwork/generated/fresh-finds.jpg')),
  'asset:generated/hip-hop-rnb.jpg': safeRequire(() => require('../../assets/artwork/generated/hip-hop-rnb.jpg')),
  'asset:generated/horizon.jpg': safeRequire(() => require('../../assets/artwork/generated/horizon.jpg')),
  'asset:generated/jazz-soul.jpg': safeRequire(() => require('../../assets/artwork/generated/jazz-soul.jpg')),
  'asset:generated/made-for-you.jpg': safeRequire(() => require('../../assets/artwork/generated/made-for-you.jpg')),
  'asset:generated/maya-lin.jpg': safeRequire(() => require('../../assets/artwork/generated/maya-lin.jpg')),
  'asset:generated/night-signal.jpg': safeRequire(() => require('../../assets/artwork/generated/night-signal.jpg')),
  'asset:generated/nils-frahm.jpg': safeRequire(() => require('../../assets/artwork/generated/nils-frahm.jpg')),
  'asset:generated/pop.jpg': safeRequire(() => require('../../assets/artwork/generated/pop.jpg')),
  'asset:generated/resonant-field-reprise.jpg': safeRequire(() => require('../../assets/artwork/generated/resonant-field-reprise.jpg')),
  'asset:generated/rock-indie.jpg': safeRequire(() => require('../../assets/artwork/generated/rock-indie.jpg')),
  'asset:generated/sable-duo.jpg': safeRequire(() => require('../../assets/artwork/generated/sable-duo.jpg')),
  'asset:generated/still-water.jpg': safeRequire(() => require('../../assets/artwork/generated/still-water.jpg')),
  'asset:generated/tate-vane.jpg': safeRequire(() => require('../../assets/artwork/generated/tate-vane.jpg')),
  'asset:generated/this-is-solaris-echo.jpg': safeRequire(() => require('../../assets/artwork/generated/this-is-solaris-echo.jpg')),
  'asset:generated/workout-high-energy.jpg': safeRequire(() => require('../../assets/artwork/generated/workout-high-energy.jpg')),
  'asset:generated/yuki-tanaka.jpg': safeRequire(() => require('../../assets/artwork/generated/yuki-tanaka.jpg')),
  'asset:genres/kyrgyz-music.jpg': safeRequire(() => require('../../assets/artwork/genres/kyrgyz-music.jpg')),
  'asset:playlists/electronic-essentials.jpg': safeRequire(() => require('../../assets/artwork/playlists/electronic-essentials.jpg')),
  'asset:playlists/late-night-driving.jpg': safeRequire(() => require('../../assets/artwork/playlists/late-night-driving.jpg')),
  'asset:playlists/late-night-flow.jpg': safeRequire(() => require('../../assets/artwork/playlists/late-night-flow.jpg')),
  'asset:playlists/lofi-beats-to-code.jpg': safeRequire(() => require('../../assets/artwork/playlists/lofi-beats-to-code.jpg')),
  'asset:samples/sample-1.jpg': safeRequire(() => require('../../assets/artwork/samples/sample-1.jpg')),
  'asset:samples/sample-2.jpg': safeRequire(() => require('../../assets/artwork/samples/sample-2.jpg')),
  'asset:samples/sample-3.jpg': safeRequire(() => require('../../assets/artwork/samples/sample-3.jpg')),
  'asset:samples/sample-4.jpg': safeRequire(() => require('../../assets/artwork/samples/sample-4.jpg')),
  'asset:samples/sample-5.jpg': safeRequire(() => require('../../assets/artwork/samples/sample-5.jpg')),
  'asset:samples/sample-6.jpg': safeRequire(() => require('../../assets/artwork/samples/sample-6.jpg')),
  'asset:tracks/abyssal-bloom.jpg': safeRequire(() => require('../../assets/artwork/tracks/abyssal-bloom.jpg')),
  'asset:tracks/midnight-mirage.jpg': safeRequire(() => require('../../assets/artwork/tracks/midnight-mirage.jpg')),
  'asset:tracks/obsidian-frequencies.jpg': safeRequire(() => require('../../assets/artwork/tracks/obsidian-frequencies.jpg')),
  'asset:tracks/tape-saturation-4.jpg': safeRequire(() => require('../../assets/artwork/tracks/tape-saturation-4.jpg')),
  'asset:tracks/vapor-trails.jpg': safeRequire(() => require('../../assets/artwork/tracks/vapor-trails.jpg')),
  // __DEV__ only, like its key in stitchArtworkByTrackId and its audio (rights not confirmed): never bundled in production.
  ...(typeof __DEV__ !== 'undefined' && __DEV__
    ? { 'asset:tracks/mirbek-atabekov-oshondo.png': safeRequire(() => require('../../assets/artwork/tracks/mirbek-atabekov-oshondo.png')) }
    : {}),
};

/** `expo-image`'s `source` prop accepts a required module number directly,
 * an already-resolved `{ uri, width, height }` object (this project's web
 * target — see above), or `{ uri: string }` for a remote URL — this picks
 * the right shape for whichever kind of value a mock entity's cover/photo
 * field holds, resolving an artwork key to its bundled file first. A key with
 * no bundled file (not possible for catalog data, which verify-asset-keys
 * checks) yields an empty source rather than a request for the key itself. */
export function toImageSource(value: LocalOrRemoteImage): number | { uri: string } {
  if (isArtworkKey(value)) {
    const source = artworkSources[value];
    return source === undefined ? { uri: '' } : toImageSource(source);
  }
  if (typeof value === 'string') {
    return { uri: value };
  }
  return value;
}
