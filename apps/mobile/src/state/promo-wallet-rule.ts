// Shared with the website in @mmusic/core; this path is the Expo app's import.
// Configures storage first (the rule reads the demo session store).
import '@/platform/storage';

export { keepRealWalletAtZero } from '@mmusic/core/state/promo-wallet-rule';
