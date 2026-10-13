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

/**
 * The ONE place that implements "what artwork does this entity actually
 * use" fallback logic (frontend-wide artwork audit pass) — mock files call
 * this instead of each repeating an inline `a ?? b ?? c` chain
 * independently, so every entity resolves through the same priority order:
 * real recovered Stitch artwork first, then procedurally generated local
 * artwork, then (for tracks only) a related entity's own artwork (e.g. a
 * track reusing its album's cover). Returns `undefined` only when none of
 * the given sources have a value — at that point, and ONLY then, the UI's
 * own last-resort gradient+icon placeholder takes over
 * (components/ui/artwork.tsx, card.tsx, list-row.tsx). That placeholder is
 * reserved for genuinely unknown future/dynamic data (e.g. a track a user
 * creates at runtime via the Upload Track flow with a title no art could
 * have been pre-generated for) — every known catalog entity must resolve to
 * a real value through this function, which scripts/verify-artwork-
 * coverage.mjs checks automatically.
 */
export function resolveArtwork(...sources: (LocalOrRemoteImage | undefined)[]): LocalOrRemoteImage | undefined {
  for (const value of sources) {
    if (value) return value;
  }
  return undefined;
}

export const stitchArtworkByAlbumId: Record<string, LocalOrRemoteImage | undefined> = {
  'nebula-dreams': safeRequire(() => require('../../assets/artwork/albums/nebula-dreams.jpg')),
  // lost-frequencies, velvet-skyline, chronos-echoes and resonant-field (and
  // the kaelen avatar below) are the clean artwork cropped out of what were
  // captured UI/design frames (status bars, cards, captions with other names).
  'lost-frequencies': safeRequire(() => require('../../assets/artwork/albums/lost-frequencies.jpg')),
  'velvet-skyline': safeRequire(() => require('../../assets/artwork/albums/velvet-skyline.jpg')),
  'chronos-echoes': safeRequire(() => require('../../assets/artwork/albums/chronos-echoes.jpg')),
  // Cropped to the inner art (the export was a framed card).
  'refraction-horizon': safeRequire(() => require('../../assets/artwork/albums/refraction-horizon.jpg')),
  'resonant-field': safeRequire(() => require('../../assets/artwork/albums/resonant-field.jpg')),
  // Generated (the Stitch frame credited a different release); see generatedArtworkByTrackId.
  'solitary-echo': safeRequire(() => require('../../assets/artwork/albums/solitary-echo.jpg')),
  // Cropped from the approved album_horizon_deluxe/screen.png cover (the
  // previous file was an accidental design-spec screenshot with UI chrome).
  'horizon-deluxe': safeRequire(() => require('../../assets/artwork/albums/horizon-deluxe.jpg')),
  // Generated replacement (the export showed a piano brand name).
  'neo-classical-horizons': safeRequire(() => require('../../assets/artwork/albums/neo-classical-horizons.jpg')),
};

export const stitchArtworkByTrackId: Record<string, LocalOrRemoteImage | undefined> = {
  'midnight-mirage': safeRequire(() => require('../../assets/artwork/tracks/midnight-mirage.jpg')),
  // vapor-trails, abyssal-bloom, obsidian-frequencies: generated replacements for
  // captured UI frames (see generatedArtworkByTrackId for provenance).
  'vapor-trails': safeRequire(() => require('../../assets/artwork/tracks/vapor-trails.jpg')),
  'abyssal-bloom': safeRequire(() => require('../../assets/artwork/tracks/abyssal-bloom.jpg')),
  'tape-saturation-4': safeRequire(() => require('../../assets/artwork/tracks/tape-saturation-4.jpg')),
  'obsidian-frequencies': safeRequire(() => require('../../assets/artwork/tracks/obsidian-frequencies.jpg')),
  // User-supplied cover for the first real Kyrgyz audio import (see
  // assets/audio/kyrgyz/CREDITS.md) — not Stitch-recovered, but wired the
  // same way as every other real cover here.
  oshondo: safeRequire(() => require('../../assets/artwork/tracks/mirbek-atabekov-oshondo.png')),
};

export const stitchArtworkByPlaylistId: Record<string, LocalOrRemoteImage | undefined> = {
  'late-night-flow': safeRequire(() => require('../../assets/artwork/playlists/late-night-flow.jpg')),
  // Generated replacement (the export showed a car badge and dashboard UI).
  'late-night-driving': safeRequire(() => require('../../assets/artwork/playlists/late-night-driving.jpg')),
  // Generated replacement (the export had an app window baked in).
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
  // after-hours, chill-electronic, deep-focus, synthetic-waves: generated
  // replacements for captured UI frames (see generatedArtworkByTrackId).
  'after-hours': safeRequire(() => require('../../assets/artwork/foryou/after-hours.jpg')),
  'synthetic-waves': safeRequire(() => require('../../assets/artwork/foryou/synthetic-waves.jpg')),
  'deep-focus': safeRequire(() => require('../../assets/artwork/foryou/deep-focus.jpg')),
  // The Solaris Echo radio tile opens the artist, so it shows the artist's own
  // photo (the old tile image was a captured phone-UI frame).
  'solaris-echo-radio': safeRequire(() => require('../../assets/artwork/artists/solaris-echo.jpg')),
  'chill-electronic': safeRequire(() => require('../../assets/artwork/foryou/chill-electronic.jpg')),
  // Generated replacement (the export showed a brand logo and spec captions).
  'neo-soul': safeRequire(() => require('../../assets/artwork/foryou/neo-soul.jpg')),
};

/**
 * Generated artwork for entities with no clean recovered Stitch asset, kept in
 * the separate `generated/` folder and maps so provenance stays clear. These
 * are AI-generated images (Higgsfield `z_image`, prompted per entity from its
 * title, artist, genre and mood; downloaded and stored locally — the app never
 * calls an image API at runtime). They replaced earlier procedural gradient
 * placeholders. Rules for every image: no text, UI, logos, frames or
 * watermarks (titles that a model rendered anyway were cropped out).
 *
 * This map covers the four Solaris Echo tracks without their own Stitch art —
 * Horizon, Abyssal Bloom (feat.), Ember Tide and Resonant Field (Reprise).
 * `mocks/tracks.ts` falls back to it only when `stitchArtworkByTrackId` has no
 * entry, so every screen reading `track.coverUri` stays consistent.
 */
export const generatedArtworkByTrackId: Record<string, LocalOrRemoteImage | undefined> = {
  horizon: safeRequire(() => require('../../assets/artwork/generated/horizon.jpg')),
  'abyssal-bloom-feat': safeRequire(() => require('../../assets/artwork/generated/abyssal-bloom-feat.jpg')),
  'ember-tide': safeRequire(() => require('../../assets/artwork/generated/ember-tide.jpg')),
  'resonant-field-reprise': safeRequire(() => require('../../assets/artwork/generated/resonant-field-reprise.jpg')),
};

/**
 * Generated cover for the one playlist with no recovered Stitch asset — "This
 * is Solaris Echo". Same provenance rules as `generatedArtworkByTrackId`.
 */
export const generatedArtworkByPlaylistId: Record<string, LocalOrRemoteImage | undefined> = {
  'this-is-solaris-echo': safeRequire(() => require('../../assets/artwork/generated/this-is-solaris-echo.jpg')),
};

/**
 * Generated avatars for the eight mock artists with no recovered Stitch
 * photo. The seven fictional artists get genre-matched editorial portraits;
 * 'nils-frahm' names a real musician, so his image is deliberately an
 * instrument still life with no person — never a likeness of a real person.
 * Same provenance rules as `generatedArtworkByTrackId`.
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
  // analog-dreamers, overcast-skies: single-release mock artists added for the
  // Donate/View Artist fix — no dedicated portrait exists, so each reuses
  // their own (already-credited) track cover rather than a fabricated photo.
  'analog-dreamers': safeRequire(() => require('../../assets/artwork/tracks/tape-saturation-4.jpg')),
  'overcast-skies': safeRequire(() => require('../../assets/artwork/tracks/vapor-trails.jpg')),
};

/**
 * Generated covers for the 3 mock singles added for the See All "Singles"
 * filter — Afterimage (Tate Vane), Still Water (Elena Rostova), Night Signal
 * (Sable Duo). Same provenance rules as `generatedArtworkByTrackId`.
 */
export const generatedArtworkByAlbumId: Record<string, LocalOrRemoteImage | undefined> = {
  afterimage: safeRequire(() => require('../../assets/artwork/generated/afterimage.jpg')),
  'still-water': safeRequire(() => require('../../assets/artwork/generated/still-water.jpg')),
  'night-signal': safeRequire(() => require('../../assets/artwork/generated/night-signal.jpg')),
};

/**
 * Generated photographic artwork for the 12 "Curated Realms" genre/mood tiles
 * (Search → Browse All and All Genres & Moods), one scene per category mood
 * (4:3, lower-left kept dark so the overlaid title stays readable). Replaced
 * the earlier blurred procedural placeholders. Same provenance rules as
 * `generatedArtworkByTrackId`.
 */
export const generatedArtworkByGenreId: Record<string, LocalOrRemoteImage | undefined> = {
  'made-for-you': safeRequire(() => require('../../assets/artwork/generated/made-for-you.jpg')),
  'charts-viral': safeRequire(() => require('../../assets/artwork/generated/charts-viral.jpg')),
  pop: safeRequire(() => require('../../assets/artwork/generated/pop.jpg')),
  'hip-hop-rnb': safeRequire(() => require('../../assets/artwork/generated/hip-hop-rnb.jpg')),
  'electronic-dance': safeRequire(() => require('../../assets/artwork/generated/electronic-dance.jpg')),
  'rock-indie': safeRequire(() => require('../../assets/artwork/generated/rock-indie.jpg')),
  'jazz-soul': safeRequire(() => require('../../assets/artwork/generated/jazz-soul.jpg')),
  'chill-lofi': safeRequire(() => require('../../assets/artwork/generated/chill-lofi.jpg')),
  'deep-focus-ambient': safeRequire(() => require('../../assets/artwork/generated/deep-focus-ambient.jpg')),
  'workout-high-energy': safeRequire(() => require('../../assets/artwork/generated/workout-high-energy.jpg')),
  'classical-film': safeRequire(() => require('../../assets/artwork/generated/classical-film.jpg')),
  'fresh-finds': safeRequire(() => require('../../assets/artwork/generated/fresh-finds.jpg')),
};

/**
 * Neutral local sample images for the SIMULATED image pickers (Create
 * Playlist "Add Cover"/"Color Wave", Upload Track "Change Cover", Artist
 * Setup photo). No native image picker is a dependency yet, so each tap
 * cycles through these instead — the same simulated-selection approach
 * Upload Track's "Browse File" already uses. Not tied to any catalog entity,
 * so a user's pick never duplicates another entity's artwork.
 */
export const sampleImageChoices: LocalOrRemoteImage[] = [
  safeRequire(() => require('../../assets/artwork/samples/sample-1.jpg')),
  safeRequire(() => require('../../assets/artwork/samples/sample-2.jpg')),
  safeRequire(() => require('../../assets/artwork/samples/sample-3.jpg')),
  safeRequire(() => require('../../assets/artwork/samples/sample-4.jpg')),
  safeRequire(() => require('../../assets/artwork/samples/sample-5.jpg')),
  safeRequire(() => require('../../assets/artwork/samples/sample-6.jpg')),
].filter((value): value is LocalOrRemoteImage => Boolean(value));

/**
 * Catalog entries with no artwork yet, by design (docs/superpowers/plans/
 * 2026-10-12-kyrgyz-track-catalog.md): real songs/artists whose official
 * covers are copyrighted and whose generated art is a pending product
 * decision. List rows/cards render the deterministic gradient fallback
 * (src/constants/fallback-artwork.ts); the `Artwork` hero component shows
 * its icon placeholder instead. Read by
 * scripts/verify-artwork-coverage.mjs and scripts/verify-palettes.mjs to
 * exempt exactly these ids — every other entry keeps the full check.
 */
export const PENDING_ARTWORK_TRACK_IDS: string[] = [
  'kyrgyzstanym', 'muras', 'ene-til', 'alai', 'kachan-kaitat', 'jazym-kelchi',
  'kyrgyz-biyi', 'ne-segodnya', 'kirgiz-jeri', 'erke-kyz', 'chopo-choor-fantasy',
  'kyrgyzstanym-remix', 'jashtyk-kez', 'kambarkan', 'esimde', 'kyrgyz-bala',
  'taimuras', 'ananayyn', 'eto-lyubov', 'issyk-kulskiy-vaib',
];

export const PENDING_ARTWORK_ARTIST_IDS: string[] = [
  'amirchik', 'mirbek-atabekov', 'bayastan', 'begish', 'gulnur-satylganova',
  'sultan-sadyraliev', 'ulukmanapo', 'salamat-sadikova', 'tengir-too',
  'nurlanbek-nyshanov', 'omar-zhanyshov', 'kairat-kyrgyz', 'nurak-abdrakhmanov',
  'toktobek-asanaliev', 'kiggaz', 'g-voo', 'tamga', 'aibek-zamirov', 'freeman996',
];
