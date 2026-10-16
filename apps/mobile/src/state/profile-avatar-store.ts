import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ProfileAvatarState = {
  /** Data URL of the user's chosen photo, overriding the mock default. */
  photoUri?: string;
  setPhotoUri: (photoUri: string) => void;
};

/** Same no-op-on-server/no-real-localStorage guard as useLocaleStore. */
const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const avatarStorage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : noopStorage;

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
      storage: createJSONStorage(() => avatarStorage),
      skipHydration: true,
    },
  ),
);
