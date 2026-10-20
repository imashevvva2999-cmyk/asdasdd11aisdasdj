// Moved to @mmusic/core (W2.4b group 6.4); this path keeps existing imports working.
// Configures storage first, so the store never runs against an unconfigured backend.
import '@/platform/storage';

export {
  enterGuestPreview,
  exitGuestPreview,
  useDemoSessionStore,
  useIsDemoArtist,
  type DemoSnapshot,
} from '@mmusic/core/state/demo-session-store';
