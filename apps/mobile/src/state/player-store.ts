import { create } from 'zustand';

import { getTrackById, tracks as allTracks, type Track, type TrackId } from '@/mocks';

export type RepeatMode = 'off' | 'all' | 'one';

/**
 * Shared frontend player state (Фаза 4, Batch 2 — docs/development-plan.md
 * Фаза 5 "Плеер (UI и состояние)"). Single Zustand store so Album/Playlist/
 * Artist/Now Playing/Lyrics/Queue all read and mutate the same current-track,
 * queue, playing, progress and liked state instead of each screen keeping its
 * own copy — exactly the boundary architecture.md §2.1 already specifies
 * Zustand for ("локальное состояние (UI плеера, настройки)").
 *
 * IMPORTANT — what is real vs simulated here (see Batch 2 final report):
 * `progressSec` advances on a real `setInterval` tick while `isPlaying` is
 * true, and all controls (play/pause/seek/next/previous/shuffle/repeat/like)
 * mutate real state that every screen reads — this is not hardcoded per
 * screen. What is NOT real: no audio is actually decoded or output: there is
 * no react-native-track-player (or any) audio engine wired in yet. That is
 * Фаза 5's own remaining scope (real/local audio files) and is intentionally
 * out of this batch. Swapping the ticking interval below for a real audio
 * engine's position updates is the intended replacement point.
 */
type PlayerState = {
  queue: TrackId[];
  currentIndex: number;
  isPlaying: boolean;
  progressSec: number;
  shuffle: boolean;
  repeat: RepeatMode;
  likedTrackIds: Set<TrackId>;
  /** Queue "Infinity Autoplay" toggle (S-17). Preference only — there is no
   * recommendation source to append similar tracks from yet (OQ-24). */
  autoplay: boolean;
  tickHandle: ReturnType<typeof setInterval> | null;

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

const TICK_MS = 1000;

function startTicking(get: () => PlayerState, set: (partial: Partial<PlayerState>) => void) {
  const existing = get().tickHandle;
  if (existing) return;
  const handle = setInterval(() => {
    const state = get();
    if (!state.isPlaying) return;
    const track = state.currentTrack();
    if (!track) return;
    const nextProgress = state.progressSec + 1;
    if (nextProgress >= track.durationSec) {
      if (state.repeat === 'one') {
        set({ progressSec: 0 });
      } else {
        state.next();
      }
    } else {
      set({ progressSec: nextProgress });
    }
  }, TICK_MS);
  set({ tickHandle: handle });
}

function stopTicking(get: () => PlayerState, set: (partial: Partial<PlayerState>) => void) {
  const existing = get().tickHandle;
  if (existing) {
    clearInterval(existing);
    set({ tickHandle: null });
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: ['midnight-mirage', 'horizon', 'obsidian-frequencies', 'ember-tide'],
  currentIndex: 0,
  isPlaying: false,
  progressSec: 0,
  shuffle: false,
  repeat: 'off',
  likedTrackIds: new Set(['midnight-mirage', 'abyssal-bloom']),
  autoplay: false,
  tickHandle: null,

  currentTrackId: () => get().queue[get().currentIndex],
  currentTrack: () => {
    const id = get().currentTrackId();
    return id ? getTrackById(id) : undefined;
  },
  queueTracks: () => get().queue.map((id) => getTrackById(id)).filter((t): t is Track => Boolean(t)),

  play: (trackId, queue) => {
    const nextQueue = queue ?? (get().queue.includes(trackId) ? get().queue : [trackId]);
    const index = Math.max(0, nextQueue.indexOf(trackId));
    set({ queue: nextQueue, currentIndex: index, isPlaying: true, progressSec: 0 });
    startTicking(get, set);
  },

  playShuffled: (queue) => {
    if (queue.length === 0) return;
    const startIndex = Math.floor(Math.random() * queue.length);
    set({ queue, currentIndex: startIndex, shuffle: true, isPlaying: true, progressSec: 0 });
    startTicking(get, set);
  },

  togglePlayPause: () => {
    const isPlaying = !get().isPlaying;
    set({ isPlaying });
    if (isPlaying) {
      startTicking(get, set);
    }
  },

  pause: () => set({ isPlaying: false }),

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
      set({ isPlaying: false, progressSec: 0 });
      return;
    }
    set({ currentIndex: nextIndex, progressSec: 0 });
  },

  previous: () => {
    const { currentIndex, progressSec } = get();
    if (progressSec > 3) {
      set({ progressSec: 0 });
      return;
    }
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
    set({ currentIndex: prevIndex, progressSec: 0 });
  },

  seekTo: (sec) => {
    if (!Number.isFinite(sec)) return;
    const track = get().currentTrack();
    const clamped = track ? Math.max(0, Math.min(sec, track.durationSec)) : Math.max(0, sec);
    set({ progressSec: clamped });
  },

  toggleShuffle: () => set({ shuffle: !get().shuffle }),

  toggleAutoplay: () => set({ autoplay: !get().autoplay }),

  cycleRepeat: () => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const nextMode = order[(order.indexOf(get().repeat) + 1) % order.length];
    set({ repeat: nextMode });
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
    set({ currentIndex: index, isPlaying: true, progressSec: 0 });
    startTicking(get, set);
  },
}));

/** All mock tracks, exposed for screens/tests that need the full catalog (e.g. Queue). */
export const allMockTracks = allTracks;

/** Stop the shared ticking interval — exposed for tests to avoid leaking timers. */
export function stopPlayerTicking() {
  stopTicking(usePlayerStore.getState, usePlayerStore.setState);
}
