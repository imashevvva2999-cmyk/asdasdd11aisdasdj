import { getAlbumById, type Track } from '../mocks';
import type { usePlayerStore } from '../state/player-store';

/** Seek step for headset / lock-screen "skip back/forward" buttons. */
const SEEK_STEP_SEC = 10;
const ACTIONS = ['play', 'pause', 'stop', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward'] as const;
type Action = (typeof ACTIONS)[number];

type ActionDetails = { seekTime?: number; seekOffset?: number };

/** The part of `navigator.mediaSession` used here (a fake one in tests). */
export type MediaSessionLike = {
  metadata: unknown;
  playbackState: string;
  setActionHandler(action: Action, handler: ((details: ActionDetails) => void) | null): void;
  setPositionState?(state: { duration: number; position: number; playbackRate: number }): void;
};

export type MetadataInit = {
  title: string;
  artist: string;
  album?: string;
  artwork?: { src: string; sizes?: string; type?: string }[];
};

type BindOptions = {
  session: MediaSessionLike;
  store: typeof usePlayerStore;
  /** `new MediaMetadata(init)` in the browser. */
  createMetadata: (init: MetadataInit) => unknown;
  /** Absolute cover URL for the lock screen, if the track has one. */
  resolveArtwork: (track: Track) => string | undefined;
};

/**
 * Lock screen, notification, headset and keyboard media keys (W2). Mirrors
 * the player store into the browser's Media Session and routes the system
 * controls back to the same store actions the app's buttons use. Every call
 * is guarded: browsers support different subsets of actions.
 */
export function bindMediaSession({ session, store, createMetadata, resolveArtwork }: BindOptions): () => void {
  const handlers: Record<Action, (details: ActionDetails) => void> = {
    play: () => {
      if (!store.getState().isPlaying) store.getState().togglePlayPause();
    },
    pause: () => {
      if (store.getState().isPlaying) store.getState().pause();
    },
    stop: () => store.getState().pause(),
    previoustrack: () => store.getState().previous(),
    nexttrack: () => store.getState().next(),
    seekto: (details) => {
      if (typeof details.seekTime === 'number') store.getState().seekTo(details.seekTime);
    },
    seekbackward: (details) => {
      const { progressSec, seekTo } = store.getState();
      seekTo(progressSec - (details.seekOffset ?? SEEK_STEP_SEC));
    },
    seekforward: (details) => {
      const { progressSec, seekTo } = store.getState();
      seekTo(progressSec + (details.seekOffset ?? SEEK_STEP_SEC));
    },
  };
  ACTIONS.forEach((action) => setHandler(session, action, handlers[action]));

  let lastTrackId: string | undefined;
  let lastPosition: string | undefined;

  const sync = () => {
    const state = store.getState();
    const track = state.currentTrack();
    if (track?.id !== lastTrackId) {
      lastTrackId = track?.id;
      session.metadata = track ? createMetadata(metadataFor(track, resolveArtwork(track))) : null;
    }
    session.playbackState = !track ? 'none' : state.isPlaying ? 'playing' : 'paused';

    const duration = state.durationSec ?? 0;
    if (duration > 0 && Number.isFinite(duration) && session.setPositionState) {
      const position = Math.min(Math.max(0, state.progressSec), duration);
      const key = `${duration}:${position}`;
      if (key !== lastPosition) {
        lastPosition = key;
        try {
          session.setPositionState({ duration, position, playbackRate: 1 });
        } catch {
          // Older browsers reject position state; the controls still work.
        }
      }
    }
  };

  sync();
  const unsubscribe = store.subscribe(sync);
  return () => {
    unsubscribe();
    ACTIONS.forEach((action) => setHandler(session, action, null));
    session.metadata = null;
    session.playbackState = 'none';
  };
}

function metadataFor(track: Track, artwork: string | undefined): MetadataInit {
  const album = track.albumId ? getAlbumById(track.albumId)?.title : undefined;
  return {
    title: track.title,
    artist: track.artistName,
    ...(album ? { album } : {}),
    ...(artwork ? { artwork: [{ src: artwork }] } : {}),
  };
}

function setHandler(session: MediaSessionLike, action: Action, handler: ((details: ActionDetails) => void) | null) {
  try {
    session.setActionHandler(action, handler);
  } catch {
    // Unsupported action in this browser.
  }
}
