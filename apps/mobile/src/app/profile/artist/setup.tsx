import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-26 Artist Setup — UF-14 step 2. */
export default function ArtistSetupScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-26"
      title="Artist Setup"
      note="Stage name, genre, bio, location, photo, Create Artist Profile — docs/screens.md (Фаза 4, UF-14). Payout binding (OQ-48) and verification (OQ-49) are not implemented."
      links={[{ label: 'Artist Dashboard (S-27)', href: '/profile/artist/dashboard' }]}
    />
  );
}
