import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-12 Your Library — tab root (/library). */
export default function LibraryScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-12"
      title="Your Library"
      note="Filters, sort, Liked Songs card, mixed list of playlists/artists/albums — docs/screens.md §3.10 (Фаза 7)."
      links={[
        { label: 'Liked Songs (S-13)', href: '/library/liked-songs' },
        { label: 'Create Playlist (S-14, shared route)', href: '/create-playlist' },
        { label: 'Playlist (S-10/11, shared route)', href: '/playlist/demo' },
      ]}
    />
  );
}
