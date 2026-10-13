import { create } from 'zustand';

import { demoPaymentReference, type PaymentOrder, type PaymentResult } from '@/lib/payments/mbank-payment';

type PaymentStage = 'idle' | 'pending' | 'processing' | 'done';

/**
 * One in-flight MBANK checkout (demo sheet or live redirect). Screens that
 * start a payment watch `result` for their own `order.id`.
 */
type PaymentState = {
  order?: PaymentOrder;
  stage: PaymentStage;
  result?: PaymentResult;
  start: (order: PaymentOrder) => void;
  /** Demo checkout only: simulates the bank's response. Never charges anything. */
  completeDemo: (outcome: 'success' | 'cancelled' | 'failed') => Promise<void>;
  reset: () => void;
};

export const usePaymentStore = create<PaymentState>((set, get) => ({
  order: undefined,
  stage: 'idle',
  result: undefined,
  start: (order) => set({ order, stage: 'pending', result: undefined }),
  completeDemo: async (outcome) => {
    if (!get().order) return;
    if (outcome === 'cancelled') {
      set({ stage: 'done', result: { outcome, simulated: true } });
      return;
    }
    set({ stage: 'processing' });
    // Stands in for the bank's authorization round-trip.
    await new Promise((resolve) => setTimeout(resolve, 900));
    set({
      stage: 'done',
      result:
        outcome === 'success'
          ? { outcome, simulated: true, reference: demoPaymentReference() }
          : { outcome, simulated: true, message: 'Demo decline' },
    });
  },
  reset: () => set({ order: undefined, stage: 'idle', result: undefined }),
}));
