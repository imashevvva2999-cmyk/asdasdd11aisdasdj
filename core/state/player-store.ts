import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { silentEngine, type AudioEngine, type EngineStatus } from '../audio/audio-engine';
import { hasDemoAudio } from '../audio/demo-audio';
import { deserializeLikedTrackIds, serializeLikedTrackIds } from '../lib/liked-tracks-storage';
import { currentUser, getTrackById, tracks as allTracks, type Track, type TrackId } from '../mocks';
import { platformStorage } from '../platform/storage';

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
 * audio (audio/demo-audio.ts) play; any other track is `unavailable` and
 * nothing pretends to play.
 */
type PlayerState = {
  queue: TrackId[];
  currentIndex: number;
  /** Play order as queue indices: queue order, or a fixed shuffle permutation
   * (current track first) so the next/previous track is known in advance —
   * the artwork carousel shows exactly what will play. */
  order: number[];
  /** Times the play order has wrapped (repeat all) since it was built: +1 past
   * the end, −1 before the start. Lets the carousel position keep counting
   * (see `playPosition`) instead of jumping back to 0. */
  laps: number;
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
  /** The tracks a swipe (or next()/previous()) would land on; undefined at a queue edge. */
  peekNeighbors: () => { prevId: TrackId | undefined; nextId: TrackId | undefined };
  /** Tracks after the current one, in play order (Queue "Playing Next"). */
  upcomingTrackIds: () => TrackId[];
  play: (trackId: TrackId, queue?: TrackId[]) => void;
  /** "Shuffle" buttons: turn shuffle on and start from a random track. */
  playShuffled: (queue: TrackId[]) => void;
  togglePlayPause: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  /** Artwork / mini-player swipe: always the adjacent track in play order (no
   * 3 s restart rule). The track changes at once; audio starts after a short
   * settle so rapid flicks don't churn the audio engine. */
  swipeTo: (dir: 1 | -1) => void;
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
/** Swipes: wait this long after the last track change before starting audio. */
export const SWIPE_AUDIO_DELAY_MS = 180;

let engine: AudioEngine = silentEngine;
let unsubscribeEngine: () => void = () => {};
/** Track currently loaded into the engine — resuming it needs no reload. */
let loadedTrackId: TrackId | undefined;
/** A deferred (swipe) audio start that hasn't run yet. */
let pendingStart: ReturnType<typeof setTimeout> | null = null;

function cancelPendingStart() {
  if (pendingStart) {
    clearTimeout(pendingStart);
    pendingStart = null;
  }
}

function identityOrder(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}

/** Current index first, the rest in a random order. */
function shuffledOrder(length: number, first: number): number[] {
  const rest = identityOrder(length).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  return [first, ...rest];
}

function buildOrder(length: number, current: number, shuffle: boolean): number[] {
  return shuffle ? shuffledOrder(length, current) : identityOrder(length);
}

/**
 * The current track's position in play order, continuous across repeat-all
 * wraps (last → first goes 3 → 4, not 3 → 0). Drives the artwork carousel and
 * the adaptive colours, so a wrap moves on by one slot like any other swipe.
 */
export function playPosition(state: Pick<PlayerState, 'order' | 'currentIndex' | 'laps'>): number {
  return state.order.indexOf(state.currentIndex) + state.laps * state.order.length;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => {
  /**
   * Starts the current track from the top: real audio, or honestly
   * unavailable. `deferMs` (swipes) stops the old audio now but loads the new
   * track only after the delay; a newer change cancels the pending start.
   */
  function startCurrent(deferMs = 0) {
    cancelPendingStart();
    const id = get().currentTrackId();
    if (!hasDemoAudio(id)) {
      engine.pause();
      loadedTrackId = undefined;
      set({ playback: 'unavailable', isPlaying: false, progressSec: 0, durationSec: undefined });
      return;
    }
    set({ playback: 'loading', isPlaying: false, progressSec: 0, durationSec: undefined });
    const begin = () => {
      pendingStart = null;
      loadedTrackId = id;
      engine.load(id!);
      engine.setLoop(get().repeat === 'one');
      engine.play();
      // Skipping or swiping to a neighbour then starts without waiting for its file.
      const { queue } = get();
      const neighbours = [neighborIndex(1), neighborIndex(-1)].map((i) => (i === undefined ? undefined : queue[i]));
      engine.prefetch?.(neighbours.filter((n): n is TrackId => n !== undefined && n !== id && hasDemoAudio(n)));
    };
    if (deferMs > 0) {
      engine.pause();
      pendingStart = setTimeout(begin, deferMs);
    } else {
      begin();
    }
  }

  /** Queue index of the adjacent track in play order (wraps with repeat all). */
  function neighborIndex(dir: 1 | -1): number | undefined {
    return neighborStep(dir)?.index;
  }

  /** The adjacent track and the lap change it takes (±1 when it wraps). */
  function neighborStep(dir: 1 | -1): { index: number; lapDelta: number } | undefined {
    const { order, currentIndex, repeat } = get();
    const pos = order.indexOf(currentIndex);
    if (pos === -1) return undefined;
    const target = pos + dir;
    if (target >= 0 && target < order.length) return { index: order[target]!, lapDelta: 0 };
    if (repeat === 'all' && order.length > 1) return { index: order[(target + order.length) % order.length]!, lapDelta: dir };
    return undefined;
  }

  function stopAtEnd() {
    engine.pause();
    engine.seekTo(0);
    set({ playback: 'paused', isPlaying: false, progressSec: 0 });
  }

  return {
    queue: ['midnight-mirage', 'horizon', 'obsidian-frequencies', 'ember-tide'],
    currentIndex: 0,
    order: identityOrder(4),
    laps: 0,
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

    peekNeighbors: () => {
      const { queue } = get();
      const prev = neighborIndex(-1);
      const next = neighborIndex(1);
      return { prevId: prev === undefined ? undefined : queue[prev], nextId: next === undefined ? undefined : queue[next] };
    },

    upcomingTrackIds: () => {
      const { order, currentIndex, queue } = get();
      return order.slice(order.indexOf(currentIndex) + 1).map((i) => queue[i]!);
    },

    play: (trackId, queue) => {
      const nextQueue = queue ?? (get().queue.includes(trackId) ? get().queue : [trackId]);
      const index = Math.max(0, nextQueue.indexOf(trackId));
      const sameQueue = nextQueue === get().queue;
      set(
        sameQueue
          ? { queue: nextQueue, currentIndex: index }
          : { queue: nextQueue, currentIndex: index, order: buildOrder(nextQueue.length, index, get().shuffle), laps: 0 },
      );
      startCurrent();
    },

    playShuffled: (queue) => {
      if (queue.length === 0) return;
      const startIndex = Math.floor(Math.random() * queue.length);
      set({ queue, currentIndex: startIndex, shuffle: true, order: shuffledOrder(queue.length, startIndex), laps: 0 });
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
      cancelPendingStart();
      engine.pause();
      set({ playback: 'paused', isPlaying: false });
    },

    next: () => {
      if (get().queue.length === 0) return;
      const step = neighborStep(1);
      if (step === undefined) {
        stopAtEnd();
        return;
      }
      set({ currentIndex: step.index, laps: get().laps + step.lapDelta });
      startCurrent();
    },

    previous: () => {
      const { currentIndex, progressSec, playback } = get();
      if (progressSec > RESTART_THRESHOLD_SEC && playback !== 'unavailable') {
        engine.seekTo(0);
        set({ progressSec: 0 });
        return;
      }
      const { order } = get();
      const pos = order.indexOf(currentIndex);
      set({ currentIndex: pos > 0 ? order[pos - 1]! : currentIndex });
      startCurrent();
    },

    swipeTo: (dir) => {
      const step = neighborStep(dir);
      if (step === undefined) return;
      set({ currentIndex: step.index, laps: get().laps + step.lapDelta });
      startCurrent(SWIPE_AUDIO_DELAY_MS);
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

    toggleShuffle: () => {
      const shuffle = !get().shuffle;
      set({ shuffle, order: buildOrder(get().queue.length, get().currentIndex, shuffle), laps: 0 });
    },

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
      const currentIndex = Math.min(startIndex, Math.max(ids.length - 1, 0));
      set({ queue: ids, currentIndex, order: buildOrder(ids.length, currentIndex, get().shuffle), laps: 0 });
    },

    removeFromQueue: (trackId) => {
      const { queue, currentIndex } = get();
      const removeIndex = queue.indexOf(trackId);
      if (removeIndex === -1 || removeIndex === currentIndex) return;
      const nextQueue = queue.filter((id) => id !== trackId);
      const nextIndex = removeIndex < currentIndex ? currentIndex - 1 : currentIndex;
      const order = get()
        .order.filter((i) => i !== removeIndex)
        .map((i) => (i > removeIndex ? i - 1 : i));
      set({ queue: nextQueue, currentIndex: nextIndex, order, laps: 0 });
    },

    playFromQueueIndex: (index) => {
      const { queue } = get();
      if (index < 0 || index >= queue.length) return;
      set({ currentIndex: index });
      startCurrent();
    },
  };
    },
    {
      name: `mmusic:liked-tracks:${currentUser.username}`,
      // The app configures the backend (localStorage on web; none on native,
      // static rendering or blocked storage) — see platform/storage.ts.
      storage: createJSONStorage(() => platformStorage),
      // Static web export (app.json web.output: "static") pre-renders with the
      // store's defaults; rehydrating synchronously on module load would diverge
      // from that server HTML and trigger a React hydration mismatch. Skipping
      // here and rehydrating from a client-only effect (root _layout.tsx) keeps
      // the first paint SSR-safe.
      skipHydration: true,
      partialize: (state) => ({ likedTrackIds: serializeLikedTrackIds(state.likedTrackIds) }),
      // No persisted key yet (first-ever load): keep currentState's own default
      // likedTrackIds rather than overwriting them with an empty Set.
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { likedTrackIds?: unknown } | undefined;
        if (persisted?.likedTrackIds === undefined) return currentState;
        return { ...currentState, likedTrackIds: deserializeLikedTrackIds(persisted.likedTrackIds) };
      },
    },
  ),
);

/** Applies one engine status update to the store. */
function handleEngineStatus(status: EngineStatus) {
  const state = usePlayerStore.getState();
  // Nothing is playing for these; ignore late updates from a previous track.
  if (state.playback === 'unavailable' || state.playback === 'idle') return;
  // A swipe's audio start is pending: updates still come from the old track.
  if (pendingStart) return;

  if (status.error) {
    usePlayerStore.setState({ playback: 'error', isPlaying: false });
    return;
  }

  if (status.blocked) {
    usePlayerStore.setState({ playback: 'paused', isPlaying: false });
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
