import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/**
 * S-14 Create Playlist — shared route (Library "+", or "New Playlist" inside the
 * Add to Playlist sheet — docs/screens.md §2 notes three entry points, unified
 * under OQ-19). Root-level since it's reached from multiple contexts.
 */
export default function CreatePlaylistScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-14"
      title="Create Playlist"
      note="Cover (photo / AI Generate / Color Wave), Name, Description, Public/Collaborative — docs/screens.md §3.6 (Фаза 7)."
    />
  );
}
