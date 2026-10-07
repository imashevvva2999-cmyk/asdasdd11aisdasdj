/**
 * Central mapping from mock entity id -> recovered Stitch artwork (Фаза 4
 * artwork restoration pass). These 27 images are the real artwork the
 * approved Stitch export generated for these exact entities — recovered
 * from Home (home_feed), Library (your_library), Profile Hub
 * (profile_hub_mmusic), and the Kyrgyz Music genre detail
 * (genre_category_kyrgyz_music) exports' still-resolvable
 * `lh3.googleusercontent.com/aida-public/...` URLs (downloaded once here,
 * not hot-linked at runtime — see docs/screens.md §0). No AI art was
 * generated for this project; every file here is Stitch's own output.
 *
 * Values are whatever `require()` of a local image returns, taken as-is —
 * that shape differs by platform/target: a plain numeric module id on
 * native, but on this project's web/Metro config already a resolved
 * `{ uri, width, height }` object. Re-wrapping that object in a second
 * `{ uri: ... } ` (treating it like a remote-URL string) breaks `<Image>` at
 * runtime ("s?.uri?.startsWith is not a function") since its `.uri` is then
 * itself an object, not a string — `toImageSource` below passes an
 * already-object value straight through instead.
 *
 * `require()` targets must be static string literals for Metro to bundle
 * them, so every file is required explicitly in this one place — mocks
 * files only do a plain object lookup by id, never a require() of their own.
 *
 * Each call is wrapped in `safeRequire` because `scripts/verify-*-store.mjs`
 * import the mocks (transitively, this file) through plain `tsx`/Node, not
 * Metro — Node has no asset transform and throws trying to `require()` a raw
 * `.jpg` as CommonJS. Metro still finds the literal string argument to the
 * inner `require()` call for real bundling either way; the wrapper only
 * changes what happens when that call throws outside Metro.
 */
export type LocalOrRemoteImage = string | number | { uri: string; width?: number; height?: number };

/** `expo-image`'s `source` prop accepts a required module number directly,
 * an already-resolved `{ uri, width, height }` object (this project's web
 * target — see above), or `{ uri: string }` for a remote URL — this picks
 * the right shape for whichever kind of value a mock entity's cover/photo
 * field holds. */
export function toImageSource(value: LocalOrRemoteImage): number | { uri: string } {
  if (typeof value === 'string') {
    return { uri: value };
  }
  return value;
}

function safeRequire(loadModule: () => LocalOrRemoteImage): LocalOrRemoteImage | undefined {
  try {
    return loadModule();
  } catch {
    return undefined;
  }
}

export const stitchArtworkByAlbumId: Record<string, LocalOrRemoteImage | undefined> = {
  'nebula-dreams': safeRequire(() => require('../../assets/artwork/albums/nebula-dreams.jpg')),
  'lost-frequencies': safeRequire(() => require('../../assets/artwork/albums/lost-frequencies.jpg')),
  'velvet-skyline': safeRequire(() => require('../../assets/artwork/albums/velvet-skyline.jpg')),
  'chronos-echoes': safeRequire(() => require('../../assets/artwork/albums/chronos-echoes.jpg')),
  'refraction-horizon': safeRequire(() => require('../../assets/artwork/albums/refraction-horizon.jpg')),
  'resonant-field': safeRequire(() => require('../../assets/artwork/albums/resonant-field.jpg')),
  'solitary-echo': safeRequire(() => require('../../assets/artwork/albums/solitary-echo.jpg')),
  'horizon-deluxe': safeRequire(() => require('../../assets/artwork/albums/horizon-deluxe.jpg')),
  'neo-classical-horizons': safeRequire(() => require('../../assets/artwork/albums/neo-classical-horizons.jpg')),
};

export const stitchArtworkByTrackId: Record<string, LocalOrRemoteImage | undefined> = {
  'midnight-mirage': safeRequire(() => require('../../assets/artwork/tracks/midnight-mirage.jpg')),
  'vapor-trails': safeRequire(() => require('../../assets/artwork/tracks/vapor-trails.jpg')),
  'abyssal-bloom': safeRequire(() => require('../../assets/artwork/tracks/abyssal-bloom.jpg')),
  'tape-saturation-4': safeRequire(() => require('../../assets/artwork/tracks/tape-saturation-4.jpg')),
  'obsidian-frequencies': safeRequire(() => require('../../assets/artwork/tracks/obsidian-frequencies.jpg')),
};

export const stitchArtworkByPlaylistId: Record<string, LocalOrRemoteImage | undefined> = {
  'late-night-flow': safeRequire(() => require('../../assets/artwork/playlists/late-night-flow.jpg')),
  'late-night-driving': safeRequire(() => require('../../assets/artwork/playlists/late-night-driving.jpg')),
  'lofi-beats-to-code': safeRequire(() => require('../../assets/artwork/playlists/lofi-beats-to-code.jpg')),
  'electronic-essentials': safeRequire(() => require('../../assets/artwork/playlists/electronic-essentials.jpg')),
};

export const stitchArtworkByArtistId: Record<string, LocalOrRemoteImage | undefined> = {
  'solaris-echo': safeRequire(() => require('../../assets/artwork/artists/solaris-echo.jpg')),
  kaelen: safeRequire(() => require('../../assets/artwork/artists/kaelen.jpg')),
};

export const stitchArtworkByGenreId: Record<string, LocalOrRemoteImage | undefined> = {
  'kyrgyz-music': safeRequire(() => require('../../assets/artwork/genres/kyrgyz-music.jpg')),
};

/** Keyed by `forYouTiles[].id` (docs/screens.md §3.1 S-01 "For you"). */
export const stitchArtworkByForYouTileId: Record<string, LocalOrRemoteImage | undefined> = {
  'after-hours': safeRequire(() => require('../../assets/artwork/foryou/after-hours.jpg')),
  'synthetic-waves': safeRequire(() => require('../../assets/artwork/foryou/synthetic-waves.jpg')),
  'deep-focus': safeRequire(() => require('../../assets/artwork/foryou/deep-focus.jpg')),
  'solaris-echo-radio': safeRequire(() => require('../../assets/artwork/foryou/solaris-echo-radio.jpg')),
  'chill-electronic': safeRequire(() => require('../../assets/artwork/foryou/chill-electronic.jpg')),
  'neo-soul': safeRequire(() => require('../../assets/artwork/foryou/neo-soul.jpg')),
};

/**
 * Procedurally generated local abstract artwork (Search Results visual
 * cleanup pass) for the four Solaris Echo tracks that have no recovered
 * Stitch design asset — Horizon, Abyssal Bloom (feat.), Ember Tide, and
 * Resonant Field (Reprise), all distinct from same-titled/related entities
 * that DO have real recovered art (the plain 'abyssal-bloom' track, the
 * 'horizon-deluxe' and 'resonant-field' albums). Explicitly NOT Stitch
 * output — kept in a separate `generated/` asset folder and a separate map
 * so provenance stays clear in the codebase — built with pure PIL (gradients
 * + radial glows), no AI image model, no network call, no external API.
 * `mocks/tracks.ts` falls back to this map only when `stitchArtworkByTrackId`
 * has no entry for a given track id, so every screen that already reads
 * `track.coverUri` picks these up automatically and consistently.
 */
export const generatedArtworkByTrackId: Record<string, LocalOrRemoteImage | undefined> = {
  horizon: safeRequire(() => require('../../assets/artwork/generated/horizon.jpg')),
  'abyssal-bloom-feat': safeRequire(() => require('../../assets/artwork/generated/abyssal-bloom-feat.jpg')),
  'ember-tide': safeRequire(() => require('../../assets/artwork/generated/ember-tide.jpg')),
  'resonant-field-reprise': safeRequire(() => require('../../assets/artwork/generated/resonant-field-reprise.jpg')),
};

/**
 * Procedurally generated local abstract artwork (frontend-wide artwork audit
 * pass) for the one playlist with no recovered Stitch design asset — "This is
 * Solaris Echo". Same technique and provenance rules as
 * `generatedArtworkByTrackId` above.
 */
export const generatedArtworkByPlaylistId: Record<string, LocalOrRemoteImage | undefined> = {
  'this-is-solaris-echo': safeRequire(() => require('../../assets/artwork/generated/this-is-solaris-echo.jpg')),
};

/**
 * Procedurally generated local abstract AVATAR artwork (frontend-wide
 * artwork audit pass) for the eight artists with no recovered Stitch photo.
 * Deliberately abstract gradient/glow compositions, genre-themed (never a
 * photorealistic human face — this never presents a synthetic "photo" of a
 * nonexistent person). Same build technique and provenance rules as
 * `generatedArtworkByTrackId` above.
 */
export const generatedArtworkByArtistId: Record<string, LocalOrRemoteImage | undefined> = {
  arlo: safeRequire(() => require('../../assets/artwork/generated/arlo.jpg')),
  'maya-lin': safeRequire(() => require('../../assets/artwork/generated/maya-lin.jpg')),
  'tate-vane': safeRequire(() => require('../../assets/artwork/generated/tate-vane.jpg')),
  'clover-and-the-pulse': safeRequire(() => require('../../assets/artwork/generated/clover-and-the-pulse.jpg')),
  'sable-duo': safeRequire(() => require('../../assets/artwork/generated/sable-duo.jpg')),
  'yuki-tanaka': safeRequire(() => require('../../assets/artwork/generated/yuki-tanaka.jpg')),
  'elena-rostova': safeRequire(() => require('../../assets/artwork/generated/elena-rostova.jpg')),
  'nils-frahm': safeRequire(() => require('../../assets/artwork/generated/nils-frahm.jpg')),
};

/**
 * Procedurally generated local abstract artwork (Home See All filter-
 * behavior pass) for 3 new mock singles — Afterimage (Tate Vane), Still
 * Water (Elena Rostova), Night Signal (Sable Duo) — added because only one
 * single ('refraction-horizon') existed in the catalog before this pass,
 * too thin to demonstrate a working "Singles" filter. Same build technique
 * and provenance rules as `generatedArtworkByTrackId` above.
 */
export const generatedArtworkByAlbumId: Record<string, LocalOrRemoteImage | undefined> = {
  afterimage: safeRequire(() => require('../../assets/artwork/generated/afterimage.jpg')),
  'still-water': safeRequire(() => require('../../assets/artwork/generated/still-water.jpg')),
  'night-signal': safeRequire(() => require('../../assets/artwork/generated/night-signal.jpg')),
};
