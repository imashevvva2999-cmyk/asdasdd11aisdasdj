// expo-audio's own web helper: resolves a bundled asset (require) to the URL
// the website serves it from, exactly as expo-audio does. No new dependency.
import { getSourceUri } from 'expo-audio/build/AudioUtils.web';

import { toImageSource } from '@/constants/artwork-sources';
import type { Track } from '@/mocks';
import { bindAudioEngine, usePlayerStore } from '@/state/player-store';

import { createBrowserAudioEngine } from './browser-audio-engine';
import { DEMO_SOURCES } from './demo-sources';
import { bindMediaSession, type MediaSessionLike } from './media-session';

let started = false;

/**
 * Website audio (W2): one persistent <audio> element for the whole session
 * (iOS Safari autoplay), plus Media Session for the lock screen, headset and
 * media keys. Called once on the client from the root layout — never during
 * static rendering.
 */
export function startAudio() {
  if (started || typeof window === 'undefined') return;
  started = true;

  const media = document.createElement('audio');
  media.id = 'mmusic-audio';
  media.setAttribute('aria-hidden', 'true');
  document.body.appendChild(media);

  bindAudioEngine(
    createBrowserAudioEngine({
      media,
      resolveUri: (trackId) => {
        const source = DEMO_SOURCES[trackId];
        return source === undefined ? undefined : getSourceUri(source);
      },
      gestureTarget: window,
    }),
  );

  if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
    bindMediaSession({
      session: navigator.mediaSession as unknown as MediaSessionLike,
      store: usePlayerStore,
      createMetadata: (init) => new MediaMetadata(init),
      resolveArtwork,
    });
  }
}

/** Absolute cover URL for the lock screen. */
function resolveArtwork(track: Track): string | undefined {
  if (track.coverUri === undefined) return undefined;
  const uri = getSourceUri(toImageSource(track.coverUri) as Parameters<typeof getSourceUri>[0]);
  return uri ? new URL(uri, window.location.href).href : undefined;
}
