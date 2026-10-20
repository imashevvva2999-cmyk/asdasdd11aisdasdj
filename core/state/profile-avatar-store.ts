import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { platformStorage } from '../platform/storage';

type ProfileAvatarState = {
  /** Data URL of the user's chosen photo, overriding the mock default. */
  photoUri?: string;
  setPhotoUri: (photoUri: string) => void;
};

/**
 * Profile Hub avatar override (S-23) — the user's picked photo persists
 * across reloads, same skipHydration + client-only rehydrate pattern
 * (root _layout.tsx) as useLocaleStore/usePlayerStore.
 */
export const useProfileAvatarStore = create<ProfileAvatarState>()(
  persist(
    (set) => ({
      photoUri: undefined,
      setPhotoUri: (photoUri) => set({ photoUri }),
    }),
    {
      name: 'mmusic:profile-avatar',
      storage: createJSONStorage(() => platformStorage),
      skipHydration: true,
    },
  ),
);
