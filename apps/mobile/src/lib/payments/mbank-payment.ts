/**
 * MBANK payment adapter selection for the Expo app. See docs/mbank-payment-integration.md.
 *
 * The payment types, the demo adapter and the id helpers live in
 * @mmusic/core (W2.4b group 5). This app-side part reads EXPO_PUBLIC_* build
 * configuration and holds the live adapter's backend call; secrets must
 * never live in this frontend bundle.
 */
import { demoMbankPaymentAdapter, type MbankPaymentAdapter } from '@mmusic/core/lib/payments/mbank-payment';

export {
  demoPaymentReference,
  newOrderId,
  type MbankPaymentAdapter,
  type PaymentOrder,
  type PaymentOutcome,
  type PaymentPurpose,
  type PaymentResult,
  type PaymentSession,
} from '@mmusic/core/lib/payments/mbank-payment';

/** Live adapter: requires EXPO_PUBLIC_PAYMENTS_API_URL (a backend you operate). */
function createLiveAdapter(apiUrl: string): MbankPaymentAdapter {
  return {
    mode: 'live',
    async createSession(order) {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/payments/mbank/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error(`Payment session request failed (${res.status})`);
      const body = (await res.json()) as { checkoutUrl?: string };
      if (!body.checkoutUrl) throw new Error('Payment backend returned no checkoutUrl');
      return { kind: 'redirect', checkoutUrl: body.checkoutUrl };
    },
  };
}

export function getMbankPaymentAdapter(): MbankPaymentAdapter {
  const mode = process.env.EXPO_PUBLIC_MBANK_PAYMENT_MODE;
  const apiUrl = process.env.EXPO_PUBLIC_PAYMENTS_API_URL;
  if (mode === 'live' && apiUrl) return createLiveAdapter(apiUrl);
  return demoMbankPaymentAdapter;
}
