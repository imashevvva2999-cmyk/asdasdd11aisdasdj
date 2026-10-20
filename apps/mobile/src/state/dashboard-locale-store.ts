// Moved to @mmusic/core (W2.4b group 6.3); this path keeps existing imports working.
// Configures storage first, so the store never runs against an unconfigured backend.
import '@/platform/storage';

export { useDashboardStrings } from '@mmusic/core/state/dashboard-locale-store';
