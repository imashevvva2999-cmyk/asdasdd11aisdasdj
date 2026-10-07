import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/**
 * S-25 Become an Artist — UF-14 step 1. Artist Flow frontend-only per current
 * scope: no real Artist creation/account linkage yet, mock/local state later.
 */
export default function BecomeArtistScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-25"
      title="Become an Artist"
      note="Share Your Sound hero, 3 feature rows, Become an Artist CTA — docs/screens.md (Фаза 4, UF-14)."
      links={[{ label: 'Artist Setup (S-26)', href: '/profile/artist/setup' }]}
    />
  );
}
