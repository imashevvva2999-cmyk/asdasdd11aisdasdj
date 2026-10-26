import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { guardStoreActions } from '../demo/guest-mode';

import { currentUser, initialSupportHistory, type ArtistId, type SupportHistoryEntry } from '../mocks';
import { appStateStorage, isRecordArray, persistedOr } from '../platform/app-state-storage';

export type SupportStage = 'selecting' | 'confirming' | 'processing' | 'success';

/**
 * Shared frontend donation/support state (Фаза 4, Batch 3 — docs/screens.md
 * §3.12 S-19…S-22). Single boundary for the whole Support flow: selected
 * artist, selected amount, currency, and the current stage, carried across
 * the Support → Confirm → Success routes instead of passing everything
 * through route params. `history` is the same local data Support History
 * (S-22) reads — a completed flow appends to it, so the two screens share
 * one model instead of a separate "fake" transaction log.
 *
 * What is real vs simulated here (Batch 3 final report): stage transitions,
 * amount selection, and the history list are real local state mutations read
 * by every screen in the flow. `confirm()` awaits a local `setTimeout` to
 * stand in for a future real payment call — see the comment at that call
 * site for exactly where to swap it in. No MBANK API, balance check, or bank
 * authentication is implemented (OQ-10 remains unresolved and unmodeled).
 */
type SupportState = {
  artistId?: ArtistId;
  amount?: number;
  currency: 'KGS';
  stage: SupportStage;
  history: SupportHistoryEntry[];

  startSupport: (artistId: ArtistId) => void;
  selectAmount: (amount: number) => void;
  goToConfirm: () => void;
  confirm: () => Promise<void>;
  reset: () => void;
};

export const useSupportStore = create<SupportState>()(
  persist(
    (set, get) => ({
  artistId: undefined,
  amount: undefined,
  currency: 'KGS',
  stage: 'selecting',
  history: initialSupportHistory,

  startSupport: (artistId) => set({ artistId, amount: undefined, stage: 'selecting' }),

  selectAmount: (amount) => set({ amount }),

  goToConfirm: () => set({ stage: 'confirming' }),

  confirm: async () => {
    const { artistId, amount, currency } = get();
    if (!artistId || !amount) return;
    set({ stage: 'processing' });

    // Local-only simulated delay standing in for a future real payment call
    // (MBANK charge + settlement). Replace this `setTimeout` with that call —
    // keep awaiting it, then keep the success transition below unchanged.
    await new Promise((resolve) => setTimeout(resolve, 700));

    const entry: SupportHistoryEntry = {
      id: `sup-${Date.now()}`,
      artistId,
      amount,
      currency,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ stage: 'success', history: [entry, ...state.history] }));
  },

  reset: () => set({ artistId: undefined, amount: undefined, stage: 'selecting' }),
    }),
    {
      // Kept across launches by the native app only (platform/app-state-storage.ts):
      // the donation history; an unfinished donation is not resumed.
      name: `mmusic:support-history:${currentUser.username}`,
      storage: createJSONStorage(() => appStateStorage),
      skipHydration: true,
      partialize: (state) => ({ history: state.history }),
      merge: (persisted, current) => ({
        ...current,
        history: persistedOr(persisted, 'history', isRecordArray('id', 'artistId', 'createdAt')<SupportHistoryEntry>, current.history),
      }),
    },
  ),
);

// Guest Demo Preview (/demo/artist) never makes donations/payments.
guardStoreActions(useSupportStore, ['startSupport', 'selectAmount', 'goToConfirm', 'confirm', 'reset'], { blocked: { confirm: Promise.resolve() } });
