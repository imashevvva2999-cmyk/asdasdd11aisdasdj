import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-09 Album — shared route (reached from Home, Search, Artist, Library). */
export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScreenPlaceholder
      screenId="S-09"
      title={`Album: ${id}`}
      note="Cover, Save/Download/Shuffle/Play, track list — docs/screens.md §3.4 (Фаза 4)."
      links={[{ label: 'Now Playing (S-15)', href: '/player/now-playing' }]}
    />
  );
}
