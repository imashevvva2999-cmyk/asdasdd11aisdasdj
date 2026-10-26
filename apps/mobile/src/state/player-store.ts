// Shared store in @mmusic/core; this path is the Expo app's import.
// Configures storage first, so the store never runs against an unconfigured backend.
import '@/platform/storage';

import { hydrateOnLoad } from '@/platform/hydrate';
import { usePlayerStore } from '@mmusic/core/state/player-store';

// iOS/Android: restore the saved state before anything renders (no-op on web).
hydrateOnLoad(usePlayerStore);

export {
  SWIPE_AUDIO_DELAY_MS,
  allMockTracks,
  bindAudioEngine,
  playPosition,
  usePlayerStore,
  type PlaybackState,
  type RepeatMode,
} from '@mmusic/core/state/player-store';
