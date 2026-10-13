/**
 * MBANK payment adapter (integration-ready). See docs/mbank-payment-integration.md.
 *
 * No official MBANK merchant integration exists in this project yet (OQ-10,
 * OQ-14, OQ-15). The default adapter is DEMO: it opens the in-app demo
 * checkout sheet and NEVER moves money. The `live` adapter expects a backend
 * that holds the MBANK merchant credentials and creates the payment session —
 * secrets must never live in this frontend bundle.
 */
export type PaymentPurpose = 'promotion' | 'studio-pro' | 'donation' | 'purchase';

export type PaymentOrder = {
  id: string;
  amountKgs: number;
  currency: 'KGS';
  /** Human-readable line shown in the checkout (e.g. campaign summary). */
  description: string;
  purpose: PaymentPurpose;
};

export type PaymentOutcome = 'success' | 'cancelled' | 'failed';

export type PaymentResult = {
  outcome: PaymentOutcome;
  /** Payment reference; demo references start with "DEMO-". */
  reference?: string;
  /** True for the demo adapter — a simulated payment is never a real charge. */
  simulated: boolean;
  message?: string;
};

export type PaymentSession =
  | { kind: 'in-app-demo' }
  /** Live: open the official MBANK widget/checkout URL returned by the backend. */
  | { kind: 'redirect'; checkoutUrl: string };

export interface MbankPaymentAdapter {
  readonly mode: 'demo' | 'live';
  createSession(order: PaymentOrder): Promise<PaymentSession>;
}

const demoAdapter: MbankPaymentAdapter = {
  mode: 'demo',
  async createSession() {
    return { kind: 'in-app-demo' };
  },
};

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
  return demoAdapter;
}

export function newOrderId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function demoPaymentReference(): string {
  return `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
