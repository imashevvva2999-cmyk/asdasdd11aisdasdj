// Shared store in @mmusic/core; this path is the Expo app's import.
// Configures storage first, so the store never runs against an unconfigured backend.
import '@/platform/storage';

import { hydrateOnLoad } from '@/platform/hydrate';
import { useSettingsStore } from '@mmusic/core/state/settings-store';

// iOS/Android: restore the saved state before anything renders (no-op on web).
hydrateOnLoad(useSettingsStore);

export {
  STREAM_QUALITIES,
  useSettingsStore,
  type BooleanSettingKey,
  type QualitySettingKey,
  type StreamQuality,
} from '@mmusic/core/state/settings-store';
