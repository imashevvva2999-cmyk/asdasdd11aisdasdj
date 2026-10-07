import type { Genre } from './types';

/** Featured regional banner on Search/All Genres (docs/screens.md §3.2 S-03/S-06). */
export const featuredGenre: Genre = {
  id: 'kyrgyz-music',
  title: 'Kyrgyz Music',
  subtitle: 'Ethno-synth & Komuz beats',
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

export function getGenreById(id: string): Genre | undefined {
  if (id === featuredGenre.id) return featuredGenre;
  return genres.find((genre) => genre.id === id);
}

/** Genre detail content (S-07) — only the Kyrgyz Music / "Steppe Resonance" genre is
 * populated with mock detail content for this batch; others fall back to a generic
 * detail shell using the Genre record above. */
export const genreDetails: Record<string, { heroTitle: string; listeners: string; description: string }> = {
  'kyrgyz-music': {
    heroTitle: 'Steppe Resonance',
    listeners: '128K listeners',
    description: 'Ethno-synth and Komuz-driven productions blending Central Asian heritage instruments with modern electronic production.',
  },
};
