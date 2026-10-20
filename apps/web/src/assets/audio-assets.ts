import type { AudioKey } from '@mmusic/core/audio/demo-audio-keys';
import { demoAudioKeys } from '@mmusic/core/audio/demo-audio-keys';
import type { TrackId } from '@mmusic/core/mocks';

import audioChillWave from '../../../mobile/assets/audio/chill-wave.mp3?url';
import audioFloatingCities from '../../../mobile/assets/audio/floating-cities.mp3?url';
import audioWindswept from '../../../mobile/assets/audio/windswept.mp3?url';
import audioReminiscing from '../../../mobile/assets/audio/reminiscing.mp3?url';
import audioComfortableMystery from '../../../mobile/assets/audio/comfortable-mystery.mp3?url';
import audioEternity from '../../../mobile/assets/audio/eternity.mp3?url';
import audioSpellbound from '../../../mobile/assets/audio/spellbound.mp3?url';
import audioOneSlyMove from '../../../mobile/assets/audio/one-sly-move.mp3?url';
import audioDeliberateThought from '../../../mobile/assets/audio/deliberate-thought.mp3?url';
import audioEquatorialComplex from '../../../mobile/assets/audio/equatorial-complex.mp3?url';
import audioLateNightRadio from '../../../mobile/assets/audio/late-night-radio.mp3?url';
import audioAirshipSerenity from '../../../mobile/assets/audio/airship-serenity.mp3?url';
import audioWinterReflections from '../../../mobile/assets/audio/winter-reflections.mp3?url';

/**
 * Website audio (W2.4c-2): every `audio:<path>` key of @mmusic/core's demoAudioKeys → the URL Vite serves the
 * Expo app's file under (apps/mobile/assets/audio — files reused in place, never copied). One explicit static
 * import per file, never a folder-wide glob, so production ships exactly these recordings.
 *
 * Ошондо (rights not confirmed) is development-only: its import lives in ./audio-assets.dev.ts, loaded through
 * a dynamic import behind `import.meta.env.DEV` — Vite removes that branch, and with it the file, from
 * production builds. (A static import would ship the file even if the code using it were removed.)
 */
const audioUrls: Partial<Record<AudioKey, string>> = {
  'audio:chill-wave.mp3': audioChillWave,
  'audio:floating-cities.mp3': audioFloatingCities,
  'audio:windswept.mp3': audioWindswept,
  'audio:reminiscing.mp3': audioReminiscing,
  'audio:comfortable-mystery.mp3': audioComfortableMystery,
  'audio:eternity.mp3': audioEternity,
  'audio:spellbound.mp3': audioSpellbound,
  'audio:one-sly-move.mp3': audioOneSlyMove,
  'audio:deliberate-thought.mp3': audioDeliberateThought,
  'audio:equatorial-complex.mp3': audioEquatorialComplex,
  'audio:late-night-radio.mp3': audioLateNightRadio,
  'audio:airship-serenity.mp3': audioAirshipSerenity,
  'audio:winter-reflections.mp3': audioWinterReflections,
};

if (import.meta.env.DEV) Object.assign(audioUrls, (await import('./audio-assets.dev')).devAudioUrls);

/** URL of an audio key, if the website has the file. */
export function audioUrlForKey(key: AudioKey): string | undefined {
  return audioUrls[key];
}

/** URL of a catalog track's demo recording — undefined for tracks without audio (e.g. the Kyrgyz tracks still pending). */
export function audioUrlForTrack(trackId: TrackId): string | undefined {
  const key = demoAudioKeys[trackId];
  return key === undefined ? undefined : audioUrls[key];
}
