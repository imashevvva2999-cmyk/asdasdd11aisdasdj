// Shared store in @mmusic/core; this path is the Expo app's import.
// Configures storage first, so the store never runs against an unconfigured backend.
import '@/platform/storage';

import { hydrateOnLoad } from '@/platform/hydrate';
import { usePlaylistsStore } from '@mmusic/core/state/playlists-store';

// iOS/Android: restore the saved state before anything renders (no-op on web).
hydrateOnLoad(usePlaylistsStore);

export {
  usePlaylistsStore,
  type CreatePlaylistInput,
} from '@mmusic/core/state/playlists-store';
