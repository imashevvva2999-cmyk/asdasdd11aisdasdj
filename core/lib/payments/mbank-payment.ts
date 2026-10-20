/**
 * MBANK payment adapter (integration-ready). See docs/mbank-payment-integration.md.
 *
 * No official MBANK merchant integration exists in this project yet (OQ-10,
 * OQ-14, OQ-15). The default adapter is DEMO: it opens the in-app demo
 * checkout sheet and NEVER moves money. The `live` adapter expects a backend
 * that holds the MBANK merchant credentials and creates the payment session —
 * secrets must never live in this frontend bundle.
 *
 * Shared part (W2.4b group 5): the payment types, the demo adapter and the id
 * helpers. Choosing an adapter from build-time configuration, and the live
 * adapter's backend call, stay with each app (apps/mobile:
 * src/lib/payments/mbank-payment.ts reads EXPO_PUBLIC_* at build time).
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

/** The default adapter: opens the in-app demo checkout and never moves money. */
export const demoMbankPaymentAdapter: MbankPaymentAdapter = {
  mode: 'demo',
  async createSession() {
    return { kind: 'in-app-demo' };
  },
};

export function newOrderId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function demoPaymentReference(): string {
  return `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
