import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-06 All Genres & Moods hub. */
export default function AllGenresScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-06"
      title="All Genres & Moods"
      note="Kyrgyz Music & Central Asian Beats hero, 12 Curated Realms — docs/screens.md §3.2 (Фаза 6)."
      links={[{ label: 'Genre detail (S-07)', href: '/search/genre/demo' }]}
    />
  );
}
