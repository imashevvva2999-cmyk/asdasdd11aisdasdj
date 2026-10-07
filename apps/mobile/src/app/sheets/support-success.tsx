import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-21 Support Success. */
export default function SupportSuccessSheet() {
  return (
    <ScreenPlaceholder
      screenId="S-21"
      title="Support Sent"
      note="Success state, Done, View Support Receipt in History — docs/screens.md §3.12 (Фаза 9, UI-only per current scope)."
      links={[{ label: 'Support History (S-22)', href: '/profile/support-history' }]}
    />
  );
}
