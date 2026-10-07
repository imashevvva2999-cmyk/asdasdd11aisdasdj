import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/**
 * S-10/S-11 Playlist Detail — shared route. Which of the two documented variants
 * (A: user playlist, B: editorial) renders is a content decision for Фаза 7, still
 * open per OQ-18 — the route itself is singular regardless of variant.
 */
export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScreenPlaceholder
      screenId="S-10 / S-11"
      title={`Playlist: ${id}`}
      note="Variant A (user) vs B (editorial) — OQ-18 still open. Play All/Shuffle/Sort, track list — docs/screens.md §3.6 (Фаза 7)."
    />
  );
}
