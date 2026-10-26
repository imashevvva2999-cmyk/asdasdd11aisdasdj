// Shared store in @mmusic/core; this path is the Expo app's import.
// Configures storage first, so the store never runs against an unconfigured backend.
import '@/platform/storage';

import { hydrateOnLoad } from '@/platform/hydrate';
import { useNotificationsStore } from '@mmusic/core/state/notifications-store';

// iOS/Android: restore the saved state before anything renders (no-op on web).
hydrateOnLoad(useNotificationsStore);

export {
  countUnread,
  notificationContent,
  useNotificationsStore,
  type DemoNotification,
  type NotificationTarget,
} from '@mmusic/core/state/notifications-store';
