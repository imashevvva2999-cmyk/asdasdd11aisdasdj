import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/**
 * S-08 Artist Profile — shared route (reached from Home, Search, Library, Genre).
 * Lives at the root level (not nested per-tab) so it is a single implementation
 * pushed onto whichever tab's stack is active, instead of being duplicated under
 * home/search/library — same screen, same Artist entity as S-27 Artist Dashboard
 * (docs/screens.md §2 "Artist Flow" note; architecture.md §6).
 */
export default function ArtistProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScreenPlaceholder
      screenId="S-08"
      title={`Artist: ${id}`}
      note="Hero, Follow/Support/Play/Shuffle, Popular, Releases, Fans Also Like, About — docs/screens.md §3.3 (Фаза 4)."
      links={[{ label: 'Support sheet (S-19)', href: '/sheets/support' }]}
    />
  );
}
