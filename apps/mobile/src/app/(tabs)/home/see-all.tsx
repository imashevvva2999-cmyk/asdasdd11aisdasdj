import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-02 See All (New Releases / Trending) — pushed within the Home tab's own stack. */
export default function SeeAllScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-02"
      title="See All"
      note="This Week / Top Charts / Albums / Singles filters, hero release, Fresh Finds — docs/screens.md §3.1 (Фаза 4). Back returns to Home within this tab's stack."
    />
  );
}
