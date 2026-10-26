// Shared store in @mmusic/core; this path is the Expo app's import.
// Configures storage first, so the store never runs against an unconfigured backend.
import '@/platform/storage';

import { hydrateOnLoad } from '@/platform/hydrate';
import { useFloatingButtonStore } from '@mmusic/core/state/floating-button-store';

// iOS/Android: restore the saved state before anything renders (no-op on web).
hydrateOnLoad(useFloatingButtonStore);

export { type FloatingButtonSide, useFloatingButtonStore } from '@mmusic/core/state/floating-button-store';
