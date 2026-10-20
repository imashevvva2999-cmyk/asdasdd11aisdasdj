// First: configures @mmusic/core storage before the persisted player store below is created.
import '@/platform/storage';

import { createBrowserAudioEngine, type BrowserAudioEngine } from '@mmusic/core/audio/browser-audio-engine';
import { bindMediaSession, type MediaSessionLike } from '@mmusic/core/audio/media-session';
import type { Track } from '@mmusic/core/mocks';
import { bindAudioEngine, usePlayerStore } from '@mmusic/core/state/player-store';

import { artworkUrl } from '@/assets/artwork-assets';
import { audioUrlForTrack } from '@/assets/audio-assets';

/**
 * Website audio (W2.4c-3): one persistent <audio id="mmusic-audio"> for the whole session (iOS Safari only lets
 * an element that a gesture started play later tracks on its own), the shared browser engine from @mmusic/core
 * bound to the shared player store, and Media Session for the lock screen, headset and media keys. Same set-up as
 * the Expo app's website build (apps/mobile/src/audio/platform-audio.web.ts); only URL resolution is the website's
 * own (src/assets/*).
 *
 * - startAudio() is idempotent: React StrictMode's repeated effects and every caller share one engine, one
 *   element and one Media Session binding.
 * - The player store is rehydrated exactly once per page load, after storage is configured (first import above)
 *   — a run-once flag, not `persist.hasHydrated()`, which stays false after malformed saved data.
 * - Vite HMR: this module accepts its own updates. Before it is replaced, its engine and Media Session binding
 *   are disposed (media listeners, gesture unlock, status ticker); the new instance takes the same element over
 *   and binds a fresh engine, so playback continues and nothing is created twice. All state lives in the
 *   module's hot data, so a stale startAudio() reference held by an importer cannot start a second engine.
 * - Client only: no window → nothing happens (static rendering, tests).
 */
type Active = { engine: BrowserAudioEngine; unbindSession?: () => void };
type Runtime = { media?: HTMLAudioElement; hydrated: boolean; started: boolean; active?: Active };
const runtime: Runtime = (import.meta.hot?.data.runtime as Runtime | undefined) ?? { hydrated: false, started: false };
if (import.meta.hot) import.meta.hot.data.runtime = runtime;

export function startAudio(): void {
  if (typeof window === 'undefined' || runtime.active) return;
  runtime.started = true;

  const media = runtime.media ?? createAudioElement();
  runtime.media = media;
  const engine = createBrowserAudioEngine({ media, resolveUri: audioUrlForTrack, gestureTarget: window });
  bindAudioEngine(engine);

  let unbindSession: (() => void) | undefined;
  if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
    unbindSession = bindMediaSession({
      session: navigator.mediaSession as unknown as MediaSessionLike,
      store: usePlayerStore,
      createMetadata: (init) => new MediaMetadata(init),
      resolveArtwork,
    });
  }
  runtime.active = { engine, unbindSession };

  if (!runtime.hydrated) {
    runtime.hydrated = true;
    void usePlayerStore.persist.rehydrate();
  }
}

function createAudioElement(): HTMLAudioElement {
  const media = document.createElement('audio');
  media.id = 'mmusic-audio';
  media.setAttribute('aria-hidden', 'true');
  document.body.appendChild(media);
  return media;
}

/** Absolute cover URL for the lock screen. */
function resolveArtwork(track: Track): string | undefined {
  const url = artworkUrl(track.coverUri);
  return url === undefined ? undefined : new URL(url, window.location.href).href;
}

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    runtime.active?.unbindSession?.();
    runtime.active?.engine.dispose();
    runtime.active = undefined;
  });
  // A replacement instance takes over audio that was already running.
  if (runtime.started) startAudio();
}
