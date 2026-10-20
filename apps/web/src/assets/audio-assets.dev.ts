import type { AudioKey } from '@mmusic/core/audio/demo-audio-keys';

import audioKyrgyzOshondo from '../../../mobile/assets/audio/kyrgyz/oshondo.mp3?url';

/** Development only — loaded by ./audio-assets.ts behind `import.meta.env.DEV`, never part of a production build.
 * Ошондо: real Kyrgyz recording, rights NOT confirmed (apps/mobile/assets/audio/kyrgyz/CREDITS.md). */
export const devAudioUrls: Partial<Record<AudioKey, string>> = {
  'audio:kyrgyz/oshondo.mp3': audioKyrgyzOshondo,
};
