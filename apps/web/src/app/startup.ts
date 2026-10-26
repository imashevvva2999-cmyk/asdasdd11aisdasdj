// First: configures @mmusic/core storage before any persisted store below is created.
import '@/platform/storage';

import { restoreArtistAccount } from '@mmusic/core/state/artist-account-persistence';
import { useDemoSessionStore } from '@mmusic/core/state/demo-session-store';
import { useProfileAvatarStore } from '@mmusic/core/state/profile-avatar-store';
import { keepRealWalletAtZero } from '@mmusic/core/state/promo-wallet-rule';

/**
 * Website start-up restores, in the Expo app's order (apps/mobile/src/app/_layout.tsx): the profile avatar, the
 * regular artist account, then a signed-in demo session (so it takes over). The last two are skipped under the
 * public guest preview (/demo/*), which must never read personal storage. Runs once per page load, before the
 * first render (storage is synchronous); the player and the language load in src/audio/web-audio.ts and
 * src/i18n/locale.ts. A run-once flag kept in Vite's hot data, so hot updates never restore twice.
 */
type StartupRuntime = { done: boolean };
const runtime: StartupRuntime = (import.meta.hot?.data.startup as StartupRuntime | undefined) ?? { done: false };
if (import.meta.hot) import.meta.hot.data.startup = runtime;

if (!runtime.done && typeof window !== 'undefined') {
  runtime.done = true;
  void useProfileAvatarStore.persist.rehydrate();
  if (!window.location.pathname.startsWith('/demo')) {
    restoreArtistAccount();
    void useDemoSessionStore.persist.rehydrate();
  }

  // Outside the demo the promo wallet is 0 (the shared rule, same as the Expo app).
  keepRealWalletAtZero();
}
