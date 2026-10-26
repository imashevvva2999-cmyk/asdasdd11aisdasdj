import { isGuestPreview, useGuestPreviewStore } from '../demo/guest-mode';
import { useCampaignStore } from './campaign-store';
import { useDemoSessionStore } from './demo-session-store';

/** The rule once: outside the demo, a non-zero wallet balance is set back to 0. */
function applyRealWalletRule() {
  if (!isGuestPreview() && !useDemoSessionStore.getState().active && useCampaignStore.getState().walletBalanceKgs !== 0) {
    useCampaignStore.setState({ walletBalanceKgs: 0 });
  }
}

/**
 * The promo wallet's 3 850 сом is the demo account's balance (part of its snapshot). A regular account has no
 * stored balance and no way to top up, so outside the demo (no guest preview, no demo session) the wallet is 0:
 * a wallet payment then honestly fails as insufficient, while the simulated MBANK payment keeps working.
 * Applied now and on every change of the stores it depends on; returns the unsubscribe. Both apps call it once at
 * start-up, after their artist account and demo session are restored.
 */
export function keepRealWalletAtZero(): () => void {
  applyRealWalletRule();
  const unsubscribes = [
    useCampaignStore.subscribe(applyRealWalletRule),
    useDemoSessionStore.subscribe(applyRealWalletRule),
    useGuestPreviewStore.subscribe(applyRealWalletRule),
  ];
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
