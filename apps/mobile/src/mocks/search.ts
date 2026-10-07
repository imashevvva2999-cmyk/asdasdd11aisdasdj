/** Recent/trending search mock state (docs/screens.md §3.2 S-03). Recent searches
 * are mutable at runtime (frontend state owns the list); this is just the initial
 * seed. */
export const initialRecentSearches = ['Tame Impala', 'Ambient Techno', 'Billie Eilish', 'Solaris Echo'];

export const trendingSearches = [
  { query: 'Challengers OST', meta: 'Trent Reznor' },
  { query: 'Midnight Mirage', meta: 'Solaris Echo' },
  { query: 'Fred again..', meta: 'Electronic' },
  { query: 'Discovery', meta: 'Daft Punk' },
];
