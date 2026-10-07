import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-01 Home — tab root (/home). Real content lands in Фаза 4. */
export default function HomeScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-01"
      title="Home"
      note="For you, Trending Now, New Releases, Jump Back In, Mood & Vibe Mixes — docs/screens.md §3.1 (Фаза 4)."
      links={[
        { label: 'See All (S-02, home tab stack)', href: '/home/see-all' },
        { label: 'Artist (S-08, shared route)', href: '/artist/demo' },
        { label: 'Album (S-09, shared route)', href: '/album/demo' },
        { label: 'Playlist (S-10/11, shared route)', href: '/playlist/demo' },
        { label: 'Now Playing (S-15, player modal)', href: '/player/now-playing' },
        { label: 'Profile (S-23)', href: '/profile' },
      ]}
    />
  );
}
