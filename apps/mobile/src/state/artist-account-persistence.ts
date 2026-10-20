// Moved to @mmusic/core (W2.4b group 6.4); this path keeps existing imports working.
// Configures storage first, so the store never runs against an unconfigured backend.
import '@/platform/storage';

export {
  ARTIST_ACCOUNT_VERSION,
  artistAccountKey,
  clearArtistAccount,
  readArtistAccount,
  restoreArtistAccount,
  setArtistAccountStorage,
  setArtistPersistencePaused,
  type SavedArtistAccount,
} from '@mmusic/core/state/artist-account-persistence';
