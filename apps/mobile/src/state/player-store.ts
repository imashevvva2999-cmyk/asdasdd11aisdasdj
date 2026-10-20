// Moved to @mmusic/core (W2.4b group 6.5); this path keeps existing imports working.
// Configures storage first, so the store never runs against an unconfigured backend.
import '@/platform/storage';

export {
  SWIPE_AUDIO_DELAY_MS,
  allMockTracks,
  bindAudioEngine,
  playPosition,
  usePlayerStore,
  type PlaybackState,
  type RepeatMode,
} from '@mmusic/core/state/player-store';
