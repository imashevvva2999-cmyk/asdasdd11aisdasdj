import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-18 Add to Playlist (bottom sheet). */
export default function AddToPlaylistSheet() {
  return (
    <ScreenPlaceholder
      screenId="S-18"
      title="Add to Playlist"
      note="Current track, search, playlist list with +/✓, New Playlist — docs/screens.md §3.6 (Фаза 7)."
      links={[{ label: 'New Playlist (S-14, shared route)', href: '/create-playlist' }]}
    />
  );
}
