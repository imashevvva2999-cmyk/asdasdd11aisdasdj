import type { ArtworkKey } from '@mmusic/core/constants/stitch-artwork';

import artTracksMirbekAtabekovOshondo from '../../../mobile/assets/artwork/tracks/mirbek-atabekov-oshondo.png?url';

/** Development only — loaded by ./artwork-assets.ts behind `import.meta.env.DEV`, never part of a production build. */
export const devArtworkUrls: Partial<Record<ArtworkKey, string>> = {
  'asset:tracks/mirbek-atabekov-oshondo.png': artTracksMirbekAtabekovOshondo,
};
