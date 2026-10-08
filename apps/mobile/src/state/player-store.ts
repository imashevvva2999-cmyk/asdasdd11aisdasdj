import { create } from 'zustand';

import { silentEngine, type AudioEngine, type EngineStatus } from '@/audio/audio-engine';
import { hasDemoAudio } from '@/audio/demo-audio';
import { getTrackById, tracks as allTracks, type Track, type TrackId } from '@/mocks';

export type RepeatMode = 'off' | 'all' | 'one';

/**
 * What the player is doing right now:
 * - `loading`     — a track with audio was asked to play; waiting for the engine
 * - `playing` / `paused` — reported by / commanded to the audio engine
 * - `unavailable` — the current track has no audio in this preview (nothing plays)
 * - `error`       — the audio failed to load or play
 */
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'unavailable' | 'error';

/**
 * Shared player state (one Zustand store, so Album/Playlist/Artist/Now
 * Playing/Lyrics/Queue/mini-player all read and mutate the same current
 * track, queue, playback and liked state — architecture.md §2.1).
 *
 * Real audio (Фаза 2 — docs/superpowers/specs/2026-10-08-phase2-real-audio-design.md):
 * playback goes through an `AudioEngine` (expo-audio in the app, bound at
 * startup via `bindAudioEngine`). Position, duration and playing/paused come
 * from the engine's status updates — there is no timer. Only tracks with demo
 * audio (src/audio/demo-audio.ts) play; any other track is `unavailable` and
 * nothing pretends to play.
 */
type PlayerState = {
  queue: TrackId[];
  currentIndex: number;
  playback: PlaybackState;
  /** `playback === 'playing'` — kept as its own field for the many readers. */
  isPlaying: boolean;
  progressSec: number;
  /** Real duration from the engine once loaded; `undefined` before that. */
  durationSec: number | undefined;
  shuffle: boolean;
  repeat: RepeatMode;
  likedTrackIds: Set<TrackId>;
  /** Queue "Infinity Autoplay" toggle (S-17). Preference only — there is no
   * recommendation source to append similar tracks from yet (OQ-24). */
  autoplay: boolean;

  currentTrack: () => Track | undefined;
  currentTrackId: () => TrackId | undefined;
  queueTracks: () => Track[];
  play: (trackId: TrackId, queue?: TrackId[]) => void;
  /** "Shuffle" buttons: turn shuffle on and start from a random track. */
  playShuffled: (queue: TrackId[]) => void;
  togglePlayPause: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (sec: number) => void;
  toggleShuffle: () => void;
  toggleAutoplay: () => void;
  cycleRepeat: () => void;
  toggleLike: (trackId: TrackId) => void;
  isLiked: (trackId: TrackId) => boolean;
  setQueue: (ids: TrackId[], startIndex?: number) => void;
  removeFromQueue: (trackId: TrackId) => void;
  playFromQueueIndex: (index: number) => void;
};

/** Restart instead of going back when Previous is pressed this far into a track. */
const RESTART_THRESHOLD_SEC = 3;

let engine: AudioEngine = silentEngine;
let unsubscribeEngine: () => void = () => {};
/** Track currently loaded into the engine — resuming it needs no reload. */
let loadedTrackId: TrackId | undefined;

export const usePlayerStore = create<PlayerState>((set, get) => {
  /** Starts the current track from the top: real audio, or honestly unavailable. */
  function startCurrent() {
    const id = get().currentTrackId();
    if (!hasDemoAudio(id)) {
      engine.pause();
      loadedTrackId = undefined;
      set({ playback: 'unavailable', isPlaying: false, progressSec: 0, durationSec: undefined });
      return;
    }
    loadedTrackId = id;
    set({ playback: 'loading', isPlaying: false, progressSec: 0, durationSec: undefined });
    engine.load(id!);
    engine.setLoop(get().repeat === 'one');
    engine.play();
  }

  function stopAtEnd() {
    engine.pause();
    engine.seekTo(0);
    set({ playback: 'paused', isPlaying: false, progressSec: 0 });
  }

  return {
    queue: ['midnight-mirage', 'horizon', 'obsidian-frequencies', 'ember-tide'],
    currentIndex: 0,
    playback: 'idle',
    isPlaying: false,
    progressSec: 0,
    durationSec: undefined,
    shuffle: false,
    repeat: 'off',
    likedTrackIds: new Set(['midnight-mirage', 'abyssal-bloom']),
    autoplay: false,

    currentTrackId: () => get().queue[get().currentIndex],
    currentTrack: () => {
      const id = get().currentTrackId();
      return id ? getTrackById(id) : undefined;
    },
    queueTracks: () => get().queue.map((id) => getTrackById(id)).filter((t): t is Track => Boolean(t)),

    play: (trackId, queue) => {
      const nextQueue = queue ?? (get().queue.includes(trackId) ? get().queue : [trackId]);
      const index = Math.max(0, nextQueue.indexOf(trackId));
      set({ queue: nextQueue, currentIndex: index });
      startCurrent();
    },

    playShuffled: (queue) => {
      if (queue.length === 0) return;
      const startIndex = Math.floor(Math.random() * queue.length);
      set({ queue, currentIndex: startIndex, shuffle: true });
      startCurrent();
    },

    togglePlayPause: () => {
      const { playback } = get();
      if (playback === 'unavailable') return;
      if (playback === 'playing' || playback === 'loading') {
        get().pause();
        return;
      }
      // idle, error, or a different track loaded → (re)load from the top.
      if (playback !== 'paused' || loadedTrackId !== get().currentTrackId()) {
        startCurrent();
        return;
      }
      engine.play();
      set({ playback: 'playing', isPlaying: true });
    },

    pause: () => {
      if (get().playback === 'unavailable') return;
      engine.pause();
      set({ playback: 'paused', isPlaying: false });
    },

    next: () => {
      const { queue, currentIndex, shuffle, repeat } = get();
      if (queue.length === 0) return;
      let nextIndex: number;
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      } else if (currentIndex + 1 < queue.length) {
        nextIndex = currentIndex + 1;
      } else if (repeat === 'all') {
        nextIndex = 0;
      } else {
        stopAtEnd();
        return;
      }
      set({ currentIndex: nextIndex });
      startCurrent();
    },

    previous: () => {
      const { currentIndex, progressSec, playback } = get();
      if (progressSec > RESTART_THRESHOLD_SEC && playback !== 'unavailable') {
        engine.seekTo(0);
        set({ progressSec: 0 });
        return;
      }
      set({ currentIndex: currentIndex > 0 ? currentIndex - 1 : 0 });
      startCurrent();
    },

    seekTo: (sec) => {
      if (!Number.isFinite(sec)) return;
      const { playback, durationSec } = get();
      if (playback === 'unavailable' || playback === 'idle') return;
      const max = durationSec ?? get().currentTrack()?.durationSec ?? 0;
      const clamped = Math.max(0, Math.min(sec, max));
      engine.seekTo(clamped);
      set({ progressSec: clamped });
    },

    toggleShuffle: () => set({ shuffle: !get().shuffle }),

    toggleAutoplay: () => set({ autoplay: !get().autoplay }),

    cycleRepeat: () => {
      const order: RepeatMode[] = ['off', 'all', 'one'];
      const nextMode = order[(order.indexOf(get().repeat) + 1) % order.length];
      set({ repeat: nextMode });
      engine.setLoop(nextMode === 'one');
    },

    toggleLike: (trackId) => {
      const liked = new Set(get().likedTrackIds);
      if (liked.has(trackId)) {
        liked.delete(trackId);
      } else {
        liked.add(trackId);
      }
      set({ likedTrackIds: liked });
    },

    isLiked: (trackId) => get().likedTrackIds.has(trackId),

    setQueue: (ids, startIndex = 0) => {
      set({ queue: ids, currentIndex: Math.min(startIndex, Math.max(ids.length - 1, 0)) });
    },

    removeFromQueue: (trackId) => {
      const { queue, currentIndex } = get();
      const removeIndex = queue.indexOf(trackId);
      if (removeIndex === -1 || removeIndex === currentIndex) return;
      const nextQueue = queue.filter((id) => id !== trackId);
      const nextIndex = removeIndex < currentIndex ? currentIndex - 1 : currentIndex;
      set({ queue: nextQueue, currentIndex: nextIndex });
    },

    playFromQueueIndex: (index) => {
      const { queue } = get();
      if (index < 0 || index >= queue.length) return;
      set({ currentIndex: index });
      startCurrent();
    },
  };
});

/** Applies one engine status update to the store. */
function handleEngineStatus(status: EngineStatus) {
  const state = usePlayerStore.getState();
  // Nothing is playing for these; ignore late updates from a previous track.
  if (state.playback === 'unavailable' || state.playback === 'idle') return;

  if (status.error) {
    usePlayerStore.setState({ playback: 'error', isPlaying: false });
    return;
  }

  const update: Partial<PlayerState> = { progressSec: status.currentTime };
  if (status.duration > 0) update.durationSec = status.duration;

  if (status.didJustFinish) {
    // A track that is still loading can't have just finished: this is a
    // duplicate report of the previous ending — don't advance twice.
    if (state.playback === 'loading') return;
    usePlayerStore.setState(update);
    if (state.repeat === 'one') {
      engine.seekTo(0);
      engine.play();
      usePlayerStore.setState({ progressSec: 0, playback: 'playing', isPlaying: true });
    } else {
      state.next();
    }
    return;
  }

  if (status.playing) {
    update.playback = 'playing';
    update.isPlaying = true;
  } else if (state.playback === 'playing') {
    // Paused by the engine itself (interruption, headphones unplugged…).
    update.playback = 'paused';
    update.isPlaying = false;
  }
  // While `loading`, a not-yet-playing status only updates position/duration.
  usePlayerStore.setState(update);
}

/** Connects the store to an audio engine (the app binds expo-audio at startup). */
export function bindAudioEngine(next: AudioEngine) {
  unsubscribeEngine();
  engine = next;
  loadedTrackId = undefined;
  unsubscribeEngine = engine.onStatus(handleEngineStatus);
}

/** All mock tracks, exposed for screens/tests that need the full catalog (e.g. Queue). */
export const allMockTracks = allTracks;
