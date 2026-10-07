import { ScreenPlaceholder } from '@/components/dev/screen-placeholder';

/** S-20 Donation Confirmation. UI flow only — no real MBANK payment/biometrics. */
export default function SupportConfirmSheet() {
  return (
    <ScreenPlaceholder
      screenId="S-20"
      title="Confirm Support"
      note="Account/available balance display, Confirm & Send — docs/screens.md §3.12 (Фаза 9, UI-only per current scope)."
      links={[{ label: 'Success (S-21)', href: '/sheets/support-success' }]}
    />
  );
}
