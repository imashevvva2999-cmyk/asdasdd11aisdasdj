import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-07 Genre / Category detail. */
export default function GenreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScreenPlaceholder
      screenId="S-07"
      title={`Genre: ${id}`}
      note="Essential Compilations, Pioneering Artists, Trending in Bishkek, New Releases — docs/screens.md §3.2 (Фаза 6)."
      links={[{ label: 'Artist (S-08)', href: '/artist/demo' }]}
    />
  );
}
