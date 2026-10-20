// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useSearchParams } from 'react-router';

import { getGenreIdForTrack, getTrackIdsForGenre } from '@mmusic/core/lib/genre-tracks';
import { lockAxis, resolveSwipe, rubberBand } from '@mmusic/core/lib/gesture-math';
import { genreNameLabel } from '@mmusic/core/lib/i18n';
import { getTrackById, type TrackId } from '@mmusic/core/mocks';
import { useDiscoveryStore } from '@mmusic/core/state/discovery-store';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';

import { PlayButton, Stage, useDocumentTitle, useEscape, useGoBack } from './shared';
import { usePlayerStrings } from './strings';

import './discover.css';

/** Wheel / trackpad: one step per gesture burst (app: discovery-feed.tsx). */
const WHEEL_THRESHOLD = 24;
const WHEEL_IDLE_MS = 220;
/** A drag claims an axis once it clears this many pixels. */
const AXIS_LOCK_PX = 8;

type Axis = 'x' | 'y';
type Offset = { x: number; y: number; animate: boolean };
const REST: Offset = { x: 0, y: 0, animate: true };

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useViewport() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/**
 * Discover (app: app/player/discover.tsx + components/player/discovery-feed.tsx) — a full-screen genre × track
 * feed. Up/down changes the track within the genre (the same `swipeTo` as the player's carousel), left/right
 * changes the genre; each genre plays its own queue through the shared player store and resumes its last track
 * (core discovery-store). Touch / pointer drags, the mouse wheel or trackpad (one step per burst), arrow keys and
 * on-screen buttons all do the same thing. Closing returns to the previous page and never stops playback.
 */
export function DiscoverPage() {
  const { t, locale } = useAppStrings();
  const ps = usePlayerStrings();
  const [params] = useSearchParams();
  const trackIdParam = params.get('trackId') ?? undefined;
  const track = usePlayerStore((s) => s.currentTrack());
  const currentTrackId = usePlayerStore((s) => s.currentTrackId());
  const playback = usePlayerStore((s) => s.playback);
  const queue = usePlayerStore((s) => s.queue);
  const order = usePlayerStore((s) => s.order);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const repeat = usePlayerStore((s) => s.repeat);
  const swipeTo = usePlayerStore((s) => s.swipeTo);
  const play = usePlayerStore((s) => s.play);
  const genreIds = useDiscoveryStore((s) => s.genreIds);
  const genreIndex = useDiscoveryStore((s) => s.genreIndex);
  const lastTrackByGenre = useDiscoveryStore((s) => s.lastTrackByGenre);
  const genreId = genreIds[genreIndex];
  const goBack = useGoBack('/home');
  useEscape(goBack);
  useDocumentTitle(ps('discoverTitle'));
  const { width, height } = useViewport();

  const { prevId, nextId } = useMemo(
    () => usePlayerStore.getState().peekNeighbors(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed whenever the queue position can change
    [queue, order, currentIndex, repeat],
  );
  const canPrevTrack = prevId !== undefined;
  const canNextTrack = nextId !== undefined;
  const canPrevGenre = genreIndex > 0;
  const canNextGenre = genreIndex < genreIds.length - 1;

  // ── Genre change (or first open): play this genre's queue, resuming its last track (app logic, verbatim) ──
  const firstRun = useRef(true);
  const entryRef = useRef<string | undefined>(undefined);
  const startIndexRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const discovery = useDiscoveryStore.getState();
    const player = usePlayerStore.getState();
    if (firstRun.current) {
      firstRun.current = false;
      entryRef.current = trackIdParam || player.currentTrackId();
      const entry = entryRef.current;
      const startGenre = (entry && getGenreIdForTrack(entry)) || discovery.genreIds[0];
      startIndexRef.current = Math.max(0, startGenre ? discovery.genreIds.indexOf(startGenre) : 0);
      if (startIndexRef.current !== discovery.genreIndex) {
        discovery.setGenreIndex(startIndexRef.current);
        return;
      }
    }
    if (startIndexRef.current !== undefined && startIndexRef.current !== genreIndex) return;
    startIndexRef.current = undefined;
    const entryTrack = entryRef.current;
    entryRef.current = undefined;
    const id = discovery.genreIds[genreIndex];
    const trackIds = id ? getTrackIdsForGenre(id) : [];
    if (trackIds.length === 0) {
      player.pause();
      return;
    }
    const restored = id ? discovery.lastTrackByGenre[id] : undefined;
    const current = player.currentTrackId();
    const sameQueue = player.queue.length === trackIds.length && player.queue.every((q, i) => q === trackIds[i]);
    // On open, the song the listener came from wins; if this genre's queue is already playing, keep its song;
    // on genre changes the remembered song wins.
    const target =
      entryTrack && trackIds.includes(entryTrack)
        ? entryTrack
        : sameQueue && current && trackIds.includes(current)
          ? current
          : restored && trackIds.includes(restored)
            ? restored
            : trackIds[0]!;
    if (!(sameQueue && current === target && player.playback !== 'idle')) play(target, trackIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per genre, like the app
  }, [genreIndex]);

  // Remember the last song per genre so returning to it resumes there.
  useEffect(() => {
    const discovery = useDiscoveryStore.getState();
    const id = discovery.genreIds[discovery.genreIndex];
    if (id && currentTrackId && getTrackIdsForGenre(id).includes(currentTrackId)) discovery.recordLastTrack(id, currentTrackId);
  }, [currentTrackId]);

  // ── Feed motion: the strips follow the drag, then settle from where they were ──
  const [offset, setOffset] = useState<Offset>(REST);
  const settleFrame = useRef(0);
  const settle = useCallback((axis: Axis, from: number) => {
    cancelAnimationFrame(settleFrame.current);
    if (prefersReducedMotion() || from === 0) {
      setOffset(REST);
      return;
    }
    setOffset({ x: axis === 'x' ? from : 0, y: axis === 'y' ? from : 0, animate: false });
    settleFrame.current = requestAnimationFrame(() => {
      settleFrame.current = requestAnimationFrame(() => setOffset(REST));
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(settleFrame.current), []);

  /** One step on an axis (+1 next, -1 previous); `dragged` is how far the strip already moved. Returns false at an edge. */
  const step = useCallback(
    (axis: Axis, dir: 1 | -1, dragged = 0): boolean => {
      if (axis === 'y') {
        const { prevId: p, nextId: n } = usePlayerStore.getState().peekNeighbors();
        if ((dir === 1 ? n : p) === undefined) return false;
        swipeTo(dir);
        settle('y', dir * height + dragged);
        return true;
      }
      const { genreIndex: gi, genreIds: ids, setGenreIndex } = useDiscoveryStore.getState();
      const target = gi + dir;
      if (target < 0 || target >= ids.length) return false;
      setGenreIndex(target);
      settle('x', dir * width + dragged);
      return true;
    },
    [swipeTo, settle, width, height],
  );

  // Keyboard: Up/Down tracks, Left/Right genres (not while a control that uses arrows has focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const map: Record<string, [Axis, 1 | -1]> = { ArrowDown: ['y', 1], ArrowUp: ['y', -1], ArrowRight: ['x', 1], ArrowLeft: ['x', -1] };
      const action = map[e.key];
      if (!action) return;
      e.preventDefault();
      step(action[0], action[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  // Wheel / trackpad: the dominant axis of a burst, one step per burst (app: handleWheel). Non-passive so a
  // horizontal trackpad swipe never turns into browser back/forward navigation.
  const surfaceRef = useRef<HTMLDivElement>(null);
  const wheel = useRef({ locked: false, timer: 0 });
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const w = wheel.current;
      window.clearTimeout(w.timer);
      w.timer = window.setTimeout(() => {
        w.locked = false;
      }, WHEEL_IDLE_MS);
      if (w.locked) return;
      const axis: Axis = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? 'x' : 'y';
      const delta = axis === 'x' ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < WHEEL_THRESHOLD) return;
      if (step(axis, delta > 0 ? 1 : -1)) w.locked = true;
    };
    const w = wheel.current;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.clearTimeout(w.timer);
    };
  }, [step]);

  // Pointer / touch drag: the axis is decided once the drag clears a small deadzone; only that axis moves.
  const drag = useRef<{ id: number; x0: number; y0: number; axis: Axis | null; samples: { t: number; v: number }[] } | null>(null);
  const edges = (axis: Axis) => (axis === 'y' ? [canPrevTrack, canNextTrack] : [canPrevGenre, canNextGenre]) as [boolean, boolean];
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    cancelAnimationFrame(settleFrame.current);
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, axis: null, samples: [] };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (d.axis === null) {
      d.axis = lockAxis(dx, dy, AXIS_LOCK_PX);
      if (d.axis === null) return;
    }
    const raw = d.axis === 'x' ? dx : dy;
    const [canPrev, canNext] = edges(d.axis);
    const moved = rubberBand(raw, canPrev, canNext);
    d.samples.push({ t: e.timeStamp, v: raw });
    if (d.samples.length > 6) d.samples.shift();
    setOffset({ x: d.axis === 'x' ? moved : 0, y: d.axis === 'y' ? moved : 0, animate: false });
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.axis === null) return;
    const moved = d.axis === 'x' ? offset.x : offset.y;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const velocity = first && last && last.t - first.t > 0 && e.timeStamp - last.t < 100 ? ((last.v - first.v) / (last.t - first.t)) * 1000 : 0;
    const [canPrev, canNext] = edges(d.axis);
    const result = cancelled ? 'cancel' : resolveSwipe(moved, velocity, d.axis === 'x' ? width : height, canPrev, canNext);
    if (result === 'cancel' || !step(d.axis, result === 'next' ? 1 : -1, moved)) setOffset(REST);
  };

  const genreSlots = ([-1, 0, 1] as const)
    .map((rel) => ({ rel, id: genreIds[genreIndex + rel] }))
    .filter((slot): slot is { rel: -1 | 0 | 1; id: string } => slot.id !== undefined);
  const songSlots: { rel: -1 | 0 | 1; id: TrackId | undefined }[] = [
    { rel: -1, id: prevId },
    { rel: 0, id: currentTrackId },
    { rel: 1, id: nextId },
  ];
  const unavailable = playback === 'unavailable';
  const motion = offset.animate ? 'df-motion' : '';

  return (
    <div className="df">
      <Stage cover={track?.coverUri} />

      <div
        ref={surfaceRef}
        className="df-surface"
        aria-roledescription={ps('discoverTitle')}
        aria-label={ps('discoverSwipeHint')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
      >
        {genreSlots.map(({ rel, id }) => (
          <div key={id} className={`df-genre ${motion}`} style={{ transform: `translate3d(calc(${rel * 100}% + ${offset.x}px), 0, 0)` } as CSSProperties}>
            {rel === 0 ? (
              songSlots.map(({ rel: songRel, id: songId }) =>
                songId ? (
                  <div key={`${songRel}-${songId}`} className={`df-song ${motion}`} style={{ transform: `translate3d(0, calc(${songRel * 100}% + ${offset.y}px), 0)` }}>
                    <Cover trackId={songId} current={songRel === 0} />
                  </div>
                ) : null,
              )
            ) : (
              <div className="df-song">
                <Cover trackId={lastTrackByGenre[id] ?? getTrackIdsForGenre(id)[0]} current={false} label={`#${genreNameLabel(locale, id)}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      <header className="df-head">
        <button type="button" className="pl-ghost" aria-label={t('closeLabel')} onClick={goBack}>
          <Icon name="close" size={26} />
        </button>
        {genreId && <span className="df-chip">#{genreNameLabel(locale, genreId)}</span>}
        {genreIds.length > 1 && (
          <span className="df-dots" aria-hidden="true">
            {genreIds.map((id, i) => (
              <span key={id} className={i === genreIndex ? 'on' : undefined} />
            ))}
          </span>
        )}
      </header>

      <div className="df-side df-left">
        <button type="button" className="df-arrow" aria-label={ps('previousGenre')} disabled={!canPrevGenre} onClick={() => step('x', -1)}>
          <Icon name="chevron-left" size={30} />
        </button>
      </div>
      <div className="df-side df-right">
        <button type="button" className="df-arrow" aria-label={ps('nextGenre')} disabled={!canNextGenre} onClick={() => step('x', 1)}>
          <Icon name="chevron-right" size={30} />
        </button>
      </div>
      <div className="df-rail">
        <button type="button" className="df-arrow" aria-label={t('previousTrackLabel')} disabled={!canPrevTrack} onClick={() => step('y', -1)}>
          <Icon name="keyboard-arrow-up" size={28} />
        </button>
        <button type="button" className="df-arrow" aria-label={t('nextTrackLabel')} disabled={!canNextTrack} onClick={() => step('y', 1)}>
          <Icon name="keyboard-arrow-down" size={28} />
        </button>
      </div>

      <footer className="df-foot">
        <div className="df-title" aria-live="polite">
          {track ? (
            <>
              <h1 className="ellipsis">{track.title}</h1>
              <p className="ellipsis pl-medium">{track.artistName}</p>
              {unavailable && <p className="df-note">{t('noAudioPreviewMessage')}</p>}
            </>
          ) : (
            <h1>{t('queueEmpty')}</h1>
          )}
        </div>
        <PlayButton size={64} />
      </footer>
      <p className="df-hint" aria-hidden="true">
        <kbd>↑</kbd>
        <kbd>↓</kbd> {ps('discoverHintTracks')} · <kbd>←</kbd>
        <kbd>→</kbd> {ps('discoverHintGenres')}
      </p>
    </div>
  );
}

function Cover({ trackId, current, label }: { trackId: TrackId | undefined; current: boolean; label?: string }) {
  const track = trackId ? getTrackById(trackId) : undefined;
  return (
    <div className={current ? 'df-cover current' : 'df-cover'}>
      <span className="df-cover-art">
        <Artwork source={track?.coverUri} loading="eager" />
      </span>
      {label && <span className="df-cover-label">{label}</span>}
    </div>
  );
}
