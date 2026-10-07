import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-19 Support Artist — quick donation sheet. UI flow only — no real payment (scope update 2026-10-06). */
export default function SupportSheet() {
  return (
    <ScreenPlaceholder
      screenId="S-19"
      title="Support Artist"
      note="Amount chips (10/50/100/500 сом) + More, Support CTA — docs/screens.md §3.12 (Фаза 9, UI-only per current scope)."
      links={[{ label: 'Confirm (S-20)', href: '/sheets/support-confirm' }]}
    />
  );
}
