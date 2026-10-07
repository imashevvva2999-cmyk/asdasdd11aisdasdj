import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-15 Now Playing — full-screen player modal. */
export default function NowPlayingScreen() {
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();

  return (
    <ScreenPlaceholder
      screenId="S-15"
      title={trackId ? `Now Playing: ${trackId}` : 'Now Playing'}
      note="Artwork halo, transport controls, Lyrics/Queue/Support/Audio bar — docs/screens.md §3.9 (Фаза 5)."
      links={[
        { label: 'Lyrics (S-16)', href: '/player/lyrics' },
        { label: 'Queue (S-17)', href: '/player/queue' },
        { label: 'Support sheet (S-19)', href: '/sheets/support' },
      ]}
    />
  );
}
