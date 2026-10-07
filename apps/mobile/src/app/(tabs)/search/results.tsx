import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/**
 * S-04 Search Results. S-05 "Empty Search" (docs/screens.md) is implemented as an
 * empty-data STATE of this same route, not a separate navigable screen — there is
 * no user action that "navigates to" an empty result set independently of searching.
 */
export default function SearchResultsScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-04 / S-05"
      title="Search Results"
      note="Top Result, Songs, Artists, Albums, Playlists; 0 results renders the S-05 empty state in place — docs/screens.md §3.2 (Фаза 6)."
    />
  );
}
