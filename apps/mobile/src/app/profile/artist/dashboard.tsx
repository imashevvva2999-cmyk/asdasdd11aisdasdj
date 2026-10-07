import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/**
 * S-27 Artist Dashboard — UF-14 step 3. Same Artist entity as the public S-08
 * Artist Profile (different screen, shared data — architecture.md §6). No
 * Overview/Analytics/Catalog/Payouts tab bar — plain stack screen only, per the
 * approved decision (docs/screens.md §1; OQ-51).
 */
export default function ArtistDashboardScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-27"
      title="Artist Dashboard"
      note="Listeners/Streams/Support stats, Your Releases list, Upload Track CTA — docs/screens.md (Фаза 4, UF-14)."
      links={[
        { label: 'Upload Track (S-28)', href: '/profile/artist/upload-track' },
        { label: 'Public Artist Profile (S-08, same entity)', href: '/artist/demo' },
      ]}
    />
  );
}
