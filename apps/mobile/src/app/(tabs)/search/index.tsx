import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-03 Search / Explore — tab root (/search). */
export default function SearchScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-03"
      title="Search"
      note="Recent/Trending searches, Browse All, Kyrgyz Music banner — docs/screens.md §3.2 (Фаза 6)."
      links={[
        { label: 'Search Results (S-04, incl. Empty S-05)', href: '/search/results' },
        { label: 'All Genres & Moods (S-06)', href: '/search/all-genres' },
        { label: 'Genre detail (S-07)', href: '/search/genre/demo' },
      ]}
    />
  );
}
