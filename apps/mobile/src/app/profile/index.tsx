import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-23 Profile Hub. Entry point proposed as an avatar in the Home/Library header (OQ-17, not yet wired — Фаза 4). */
export default function ProfileScreen() {
  return (
    <ScreenPlaceholder
      screenId="S-23"
      title="Profile"
      note="Stats, Listening Pulse, Studio Sanctuary menu — docs/screens.md §3.11 (Фаза 7). Mock/local auth state per current frontend-only scope."
      links={[
        { label: 'Settings (S-24)', href: '/profile/settings' },
        { label: 'Support History (S-22)', href: '/profile/support-history' },
        { label: 'Become an Artist (S-25) — Artist Flow start', href: '/profile/artist/become-artist' },
      ]}
    />
  );
}
