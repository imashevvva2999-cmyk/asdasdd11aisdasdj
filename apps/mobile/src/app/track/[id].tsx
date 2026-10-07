import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Deep-link target for `mmusic://track/{id}` (Share buttons — architecture.md §1
 * navigation rules). Opening a track means opening Now Playing for it; there is no
 * standalone "track screen" in docs/screens.md. Real queue/track-loading logic is
 * Фаза 5 (Player) — for now this just proves the deep-link route resolves and
 * forwards into the player modal.
 */
export default function TrackDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/player/now-playing', params: { trackId: id } }} />;
}
