import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { platformStorage } from '../platform/storage';

export type FloatingButtonSide = 'left' | 'right';

type FloatingButtonState = {
  side: FloatingButtonSide;
  /** Vertical position as a 0–1 fraction of the draggable range (safe-area-top
   * to safe-area-bottom-clearance), not a raw pixel value — stays valid across
   * window-size changes and different devices. */
  yFraction: number;
  setPosition: (side: FloatingButtonSide, yFraction: number) => void;
};

/**
 * Draggable floating MBANK payment button's last snapped position — the
 * button always rests against the left or right edge, so only the side and a
 * vertical fraction need to persist (src/components/mbank/floating-payment-button.tsx).
 */
export const useFloatingButtonStore = create<FloatingButtonState>()(
  persist(
    (set) => ({
      side: 'right',
      yFraction: 0.55,
      setPosition: (side, yFraction) => set({ side, yFraction }),
    }),
    {
      name: 'mmusic:mbank-floating-button',
      storage: createJSONStorage(() => platformStorage),
      // Same SSR-hydration-mismatch avoidance as useLocaleStore/usePlayerStore:
      // rehydrate client-only, from the root layout's effect.
      skipHydration: true,
    },
  ),
);
