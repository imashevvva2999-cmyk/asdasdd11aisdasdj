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
 * Values are stable asset keys (W2.4a): `asset:<path under assets/artwork>`,
 * e.g. `asset:albums/nebula-dreams.jpg`. This file has no `require()`, so the
 * catalog can be shared with the Vite website, which resolves the same keys
 * itself. The Expo app resolves them through the static Metro `require()`
 * table in src/constants/artwork-sources.ts — `toImageSource` there turns a
 * key into the bundled image; screens keep passing `coverUri`/`photoUri`
 * through `toImageSource` exactly as before. scripts/verify-asset-keys.mjs
 * checks that every key here has a table entry and a file on disk.
 */
export type ArtworkKey = `asset:${string}`;

/** An artwork key, a remote/data URL string, or an already-bundled image
 * (module number on native, `{ uri, width, height }` on web — e.g. one saved
 * by an earlier build). */
export type LocalOrRemoteImage = string | number | { uri: string; width?: number; height?: number };

export function isArtworkKey(value: unknown): value is ArtworkKey {
  return typeof value === 'string' && value.startsWith('asset:');
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
  'nebula-dreams': 'asset:albums/nebula-dreams.jpg',
  // lost-frequencies, velvet-skyline, chronos-echoes and resonant-field (and
  // the kaelen avatar below) are the clean artwork cropped out of what were
  // captured UI/design frames (status bars, cards, captions with other names).
  'lost-frequencies': 'asset:albums/lost-frequencies.jpg',
  'velvet-skyline': 'asset:albums/velvet-skyline.jpg',
  'chronos-echoes': 'asset:albums/chronos-echoes.jpg',
  // Cropped to the inner art (the export was a framed card).
  'refraction-horizon': 'asset:albums/refraction-horizon.jpg',
  'resonant-field': 'asset:albums/resonant-field.jpg',
  // Generated (the Stitch frame credited a different release); see generatedArtworkByTrackId.
  'solitary-echo': 'asset:albums/solitary-echo.jpg',
  // Cropped from the approved album_horizon_deluxe/screen.png cover (the
  // previous file was an accidental design-spec screenshot with UI chrome).
  'horizon-deluxe': 'asset:albums/horizon-deluxe.jpg',
  // Generated replacement (the export showed a piano brand name).
  'neo-classical-horizons': 'asset:albums/neo-classical-horizons.jpg',
};

export const stitchArtworkByTrackId: Record<string, LocalOrRemoteImage | undefined> = {
  'midnight-mirage': 'asset:tracks/midnight-mirage.jpg',
  // vapor-trails, abyssal-bloom, obsidian-frequencies: generated replacements for
  // captured UI frames (see generatedArtworkByTrackId for provenance).
  'vapor-trails': 'asset:tracks/vapor-trails.jpg',
  'abyssal-bloom': 'asset:tracks/abyssal-bloom.jpg',
  'tape-saturation-4': 'asset:tracks/tape-saturation-4.jpg',
  'obsidian-frequencies': 'asset:tracks/obsidian-frequencies.jpg',
  // User-supplied cover for the first real Kyrgyz audio import (see
  // assets/audio/kyrgyz/CREDITS.md) — not Stitch-recovered, but wired the
  // same way as every other real cover here.
  // __DEV__ only, like its audio (rights not confirmed): never bundled in production.
  ...(typeof __DEV__ === 'undefined' || __DEV__ ? { oshondo: 'asset:tracks/mirbek-atabekov-oshondo.png' } : {}),
};

export const stitchArtworkByPlaylistId: Record<string, LocalOrRemoteImage | undefined> = {
  'late-night-flow': 'asset:playlists/late-night-flow.jpg',
  // Generated replacement (the export showed a car badge and dashboard UI).
  'late-night-driving': 'asset:playlists/late-night-driving.jpg',
  // Generated replacement (the export had an app window baked in).
  'lofi-beats-to-code': 'asset:playlists/lofi-beats-to-code.jpg',
  'electronic-essentials': 'asset:playlists/electronic-essentials.jpg',
};

export const stitchArtworkByArtistId: Record<string, LocalOrRemoteImage | undefined> = {
  'solaris-echo': 'asset:artists/solaris-echo.jpg',
  kaelen: 'asset:artists/kaelen.jpg',
};

export const stitchArtworkByGenreId: Record<string, LocalOrRemoteImage | undefined> = {
  'kyrgyz-music': 'asset:genres/kyrgyz-music.jpg',
};

/** Keyed by `forYouTiles[].id` (docs/screens.md §3.1 S-01 "For you"). */
export const stitchArtworkByForYouTileId: Record<string, LocalOrRemoteImage | undefined> = {
  // after-hours, chill-electronic, deep-focus, synthetic-waves: generated
  // replacements for captured UI frames (see generatedArtworkByTrackId).
  'after-hours': 'asset:foryou/after-hours.jpg',
  'synthetic-waves': 'asset:foryou/synthetic-waves.jpg',
  'deep-focus': 'asset:foryou/deep-focus.jpg',
  // The Solaris Echo radio tile opens the artist, so it shows the artist's own
  // photo (the old tile image was a captured phone-UI frame).
  'solaris-echo-radio': 'asset:artists/solaris-echo.jpg',
  'chill-electronic': 'asset:foryou/chill-electronic.jpg',
  // Generated replacement (the export showed a brand logo and spec captions).
  'neo-soul': 'asset:foryou/neo-soul.jpg',
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
  horizon: 'asset:generated/horizon.jpg',
  'abyssal-bloom-feat': 'asset:generated/abyssal-bloom-feat.jpg',
  'ember-tide': 'asset:generated/ember-tide.jpg',
  'resonant-field-reprise': 'asset:generated/resonant-field-reprise.jpg',
};

/**
 * Generated cover for the one playlist with no recovered Stitch asset — "This
 * is Solaris Echo". Same provenance rules as `generatedArtworkByTrackId`.
 */
export const generatedArtworkByPlaylistId: Record<string, LocalOrRemoteImage | undefined> = {
  'this-is-solaris-echo': 'asset:generated/this-is-solaris-echo.jpg',
};

/**
 * Generated avatars for the eight mock artists with no recovered Stitch
 * photo. The seven fictional artists get genre-matched editorial portraits;
 * 'nils-frahm' names a real musician, so his image is deliberately an
 * instrument still life with no person — never a likeness of a real person.
 * Same provenance rules as `generatedArtworkByTrackId`.
 */
export const generatedArtworkByArtistId: Record<string, LocalOrRemoteImage | undefined> = {
  arlo: 'asset:generated/arlo.jpg',
  'maya-lin': 'asset:generated/maya-lin.jpg',
  'tate-vane': 'asset:generated/tate-vane.jpg',
  'clover-and-the-pulse': 'asset:generated/clover-and-the-pulse.jpg',
  'sable-duo': 'asset:generated/sable-duo.jpg',
  'yuki-tanaka': 'asset:generated/yuki-tanaka.jpg',
  'elena-rostova': 'asset:generated/elena-rostova.jpg',
  'nils-frahm': 'asset:generated/nils-frahm.jpg',
  // analog-dreamers, overcast-skies: single-release mock artists added for the
  // Donate/View Artist fix — no dedicated portrait exists, so each reuses
  // their own (already-credited) track cover rather than a fabricated photo.
  'analog-dreamers': 'asset:tracks/tape-saturation-4.jpg',
  'overcast-skies': 'asset:tracks/vapor-trails.jpg',
};

/**
 * Generated covers for the 3 mock singles added for the See All "Singles"
 * filter — Afterimage (Tate Vane), Still Water (Elena Rostova), Night Signal
 * (Sable Duo). Same provenance rules as `generatedArtworkByTrackId`.
 */
export const generatedArtworkByAlbumId: Record<string, LocalOrRemoteImage | undefined> = {
  afterimage: 'asset:generated/afterimage.jpg',
  'still-water': 'asset:generated/still-water.jpg',
  'night-signal': 'asset:generated/night-signal.jpg',
};

/**
 * Generated photographic artwork for the 12 "Curated Realms" genre/mood tiles
 * (Search → Browse All and All Genres & Moods), one scene per category mood
 * (4:3, lower-left kept dark so the overlaid title stays readable). Replaced
 * the earlier blurred procedural placeholders. Same provenance rules as
 * `generatedArtworkByTrackId`.
 */
export const generatedArtworkByGenreId: Record<string, LocalOrRemoteImage | undefined> = {
  'made-for-you': 'asset:generated/made-for-you.jpg',
  'charts-viral': 'asset:generated/charts-viral.jpg',
  pop: 'asset:generated/pop.jpg',
  'hip-hop-rnb': 'asset:generated/hip-hop-rnb.jpg',
  'electronic-dance': 'asset:generated/electronic-dance.jpg',
  'rock-indie': 'asset:generated/rock-indie.jpg',
  'jazz-soul': 'asset:generated/jazz-soul.jpg',
  'chill-lofi': 'asset:generated/chill-lofi.jpg',
  'deep-focus-ambient': 'asset:generated/deep-focus-ambient.jpg',
  'workout-high-energy': 'asset:generated/workout-high-energy.jpg',
  'classical-film': 'asset:generated/classical-film.jpg',
  'fresh-finds': 'asset:generated/fresh-finds.jpg',
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
  'asset:samples/sample-1.jpg',
  'asset:samples/sample-2.jpg',
  'asset:samples/sample-3.jpg',
  'asset:samples/sample-4.jpg',
  'asset:samples/sample-5.jpg',
  'asset:samples/sample-6.jpg',
];

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
