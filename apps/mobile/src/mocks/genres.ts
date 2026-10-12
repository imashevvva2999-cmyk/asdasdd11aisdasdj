import { generatedArtworkByGenreId, resolveArtwork, stitchArtworkByGenreId } from '@/constants/stitch-artwork';

import type { Genre } from './types';

/** Featured regional banner on Search/All Genres (docs/screens.md §3.2 S-03/S-06).
 * Cover recovered from the Kyrgyz Music genre detail Stitch export's own
 * "Hero Spotlight: Steppe Resonance" image (Фаза 4 restoration pass) — the
 * direct banner reference in search_explore/code.html itself no longer
 * resolves, so this is sourced from the deeper genre-detail export instead. */
export const featuredGenre: Genre = {
  id: 'kyrgyz-music',
  title: 'Kyrgyz Music',
  subtitle: 'Ethno-synth & Komuz beats',
  coverUri: resolveArtwork(stitchArtworkByGenreId['kyrgyz-music']),
};

/** "Curated Realms" / Browse All grid (12 categories, docs/screens.md §3.2 S-06). */
export const genres: Genre[] = [
  { id: 'made-for-you', title: 'Made For You', number: 1 },
  { id: 'charts-viral', title: 'Charts & Viral', number: 2 },
  { id: 'pop', title: 'Pop', number: 3 },
  { id: 'hip-hop-rnb', title: 'Hip-Hop & R&B', number: 4 },
  { id: 'electronic-dance', title: 'Electronic & Dance', number: 5 },
  { id: 'rock-indie', title: 'Rock & Indie', number: 6 },
  { id: 'jazz-soul', title: 'Jazz & Soul', number: 7 },
  { id: 'chill-lofi', title: 'Chill & Lo-Fi', number: 8 },
  { id: 'deep-focus-ambient', title: 'Deep Focus & Ambient', number: 9 },
  { id: 'workout-high-energy', title: 'Workout & High Energy', number: 10 },
  { id: 'classical-film', title: 'Classical & Film', number: 11 },
  { id: 'fresh-finds', title: 'Fresh Finds', number: 12 },
];

// Procedurally generated local abstract cover per category (complete
// frontend-wide artwork audit pass) — see generatedArtworkByGenreId in
// src/constants/stitch-artwork.ts. These 12 tiles previously had no artwork
// field at all, always rendering the generic music-note placeholder.
for (const genre of genres) {
  const coverUri = resolveArtwork(generatedArtworkByGenreId[genre.id]);
  if (coverUri) genre.coverUri = coverUri;
}

export function getGenreById(id: string): Genre | undefined {
  if (id === featuredGenre.id) return featuredGenre;
  return genres.find((genre) => genre.id === id);
}

export type GenreDetail = {
  /** Small pill above the title: what kind of category this is. */
  label: string;
  description: string;
  /** Replaces the category name as the hero title (Stitch S-07 "Steppe Resonance"). */
  heroTitle?: string;
  /** Only where the design supplies a figure — none are invented. */
  listeners?: string;
};

/** Genre detail copy (S-07) for every Browse All category — editorial text for
 * the existing categories, not new catalog content. */
export const genreDetails: Record<string, GenreDetail> = {
  'kyrgyz-music': {
    label: 'Regional',
    heroTitle: 'Steppe Resonance',
    description: 'Ethno-synth and Komuz-driven productions blending Central Asian heritage instruments with modern electronic production.',
  },
  'made-for-you': { label: 'Personal', description: 'Mixes shaped around what you play most, refreshed as your listening changes.' },
  'charts-viral': { label: 'Charts', description: 'The tracks everyone is playing and sharing right now.' },
  pop: { label: 'Genre', description: 'Big hooks, bright production and the songs that define the moment.' },
  'hip-hop-rnb': { label: 'Genre', description: 'Hard-hitting beats, sharp verses and smooth late-night R&B.' },
  'electronic-dance': { label: 'Genre', description: 'From warm synth textures to peak-time club energy.' },
  'rock-indie': { label: 'Genre', description: 'Guitar-led records, from raw garage energy to dreamy indie.' },
  'jazz-soul': { label: 'Genre', description: 'Rich voices, live instruments and timeless grooves.' },
  'chill-lofi': { label: 'Mood', description: 'Soft beats and mellow textures for slowing down.' },
  'deep-focus-ambient': { label: 'Mood', description: 'Calm, spacious sound that stays out of your way while you work.' },
  'workout-high-energy': { label: 'Mood', description: 'Driving tempos to keep you moving through every set.' },
  'classical-film': { label: 'Genre', description: 'Orchestral works and cinematic scores, from quiet to grand.' },
  'fresh-finds': { label: 'Discovery', description: 'New and rising artists worth hearing early.' },
};
