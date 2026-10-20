// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';

import type { LocalOrRemoteImage } from '@mmusic/core/constants/stitch-artwork';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { Icon } from '@mmusic/ui-kit/web';

import { startAudio } from '@/audio/web-audio';
import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';

import './player.css';

/**
 * Shared pieces of the full player (Now Playing, Queue, Lyrics) and Discover — the website versions of the app's
 * components/player/* (seek bar, transport, Lyrics/Queue header, cover-coloured stage). Playback always goes
 * through the shared player store; nothing here keeps its own playback state.
 */

/** Full-screen player routes render outside the site shell, so they start the (idempotent) website audio too. */
export function PlayerLayout() {
  useEffect(() => {
    startAudio();
  }, []);
  return <Outlet />;
}

/** Back to where the listener came from (in-app history), or to `fallback` when the page was opened directly. */
export function useGoBack(fallback: string) {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) void navigate(-1);
    else void navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}

/** Escape closes a full-screen player view (the app's Back / swipe-down). */
export function useEscape(action: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [action]);
}

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} – Mmusic`;
  }, [title]);
}

/** Dynamic Premium stage: the current cover, blurred and darkened, behind the whole view. Decorative. */
export function Stage({ cover }: { cover: LocalOrRemoteImage | undefined }) {
  return (
    <div className="pl-stage" aria-hidden="true">
      <Artwork source={cover} className="pl-stage-art" loading="eager" />
      <div className="pl-stage-shade" />
    </div>
  );
}

export const formatTime = (totalSeconds: number) => {
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

/** The current track's length: the engine's real duration once loaded, the catalog value until then. */
export function useDuration(): number {
  const engineDuration = usePlayerStore((s) => s.durationSec);
  const catalogDuration = usePlayerStore((s) => s.currentTrack()?.durationSec);
  return engineDuration ?? catalogDuration ?? 0;
}

/**
 * Scrubber (app: components/player/seek-bar.tsx). A native range input: drag or click shows a live preview and
 * seeks once on release; arrow keys / Page keys seek directly. Unavailable or failed playback replaces the time
 * row with the store's honest message, same height.
 */
export function SeekBar() {
  const { t } = useAppStrings();
  const progressSec = usePlayerStore((s) => s.progressSec);
  const playback = usePlayerStore((s) => s.playback);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const durationSec = useDuration();
  const [previewSec, setPreviewSec] = useState<number | null>(null);
  const dragging = useRef(false);

  const unavailable = playback === 'unavailable';
  const failed = playback === 'error';
  const disabled = unavailable || durationSec <= 0;
  const shown = Math.min(previewSec ?? progressSec, durationSec || 0);
  const ratio = durationSec > 0 ? Math.min(1, shown / durationSec) : 0;
  const message = unavailable ? t('noAudioPreviewMessage') : failed ? t('playbackErrorMessage') : undefined;

  const commit = (value: number) => {
    dragging.current = false;
    setPreviewSec(null);
    seekTo(value);
  };

  return (
    <div className="pl-seek">
      <input
        type="range"
        className="pl-range"
        min={0}
        max={Math.max(1, Math.floor(durationSec))}
        step={1}
        value={Math.floor(disabled ? 0 : shown)}
        disabled={disabled}
        aria-label={t('seekLabel')}
        aria-valuetext={`${formatTime(shown)} ${t('ofConnectorWord')} ${formatTime(durationSec)}`}
        style={{ '--fill': `${(disabled ? 0 : ratio) * 100}%` } as CSSProperties}
        onPointerDown={() => {
          dragging.current = true;
        }}
        onChange={(e) => {
          const value = Number(e.currentTarget.value);
          if (dragging.current) setPreviewSec(value);
          else seekTo(value);
        }}
        onPointerUp={(e) => {
          if (dragging.current) commit(Number(e.currentTarget.value));
        }}
        onPointerCancel={() => {
          dragging.current = false;
          setPreviewSec(null);
        }}
        onBlur={(e) => {
          if (dragging.current) commit(Number(e.currentTarget.value));
        }}
      />
      <div className="pl-time">
        {message ? (
          <output>{message}</output>
        ) : (
          <>
            <span>{formatTime(shown)}</span>
            <span>-{formatTime(Math.max(0, durationSec - shown))}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** The big coral play / pause button with the store's labels (unavailable, loading, playing, paused). */
export function PlayButton({ size = 72 }: { size?: number }) {
  const { t } = useAppStrings();
  const playback = usePlayerStore((s) => s.playback);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const unavailable = playback === 'unavailable';
  const loading = playback === 'loading';
  const label = unavailable ? t('playUnavailableLabel') : loading ? t('loadingPauseLabel') : isPlaying ? t('pauseLabel') : t('playLabel');
  return (
    <button
      type="button"
      className={loading ? 'pl-play loading' : 'pl-play'}
      style={{ width: size, height: size }}
      aria-label={label}
      disabled={unavailable}
      onClick={togglePlayPause}
    >
      <Icon name={isPlaying || loading ? 'pause' : 'play-arrow'} size={Math.round(size / 2)} />
    </button>
  );
}

/** Persistent controls under Lyrics and Queue (app: player-transport.tsx): scrubber + previous / play / next. */
export function Transport() {
  const { t } = useAppStrings();
  const track = usePlayerStore((s) => s.currentTrack());
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  if (!track) return null;
  return (
    <div className="pl-transport">
      <SeekBar />
      <div className="pl-transport-row">
        <button type="button" className="pl-ghost" aria-label={t('previousTrackLabel')} onClick={previous}>
          <Icon name="skip-previous" size={32} />
        </button>
        <PlayButton size={60} />
        <button type="button" className="pl-ghost" aria-label={t('nextTrackLabel')} onClick={next}>
          <Icon name="skip-next" size={32} />
        </button>
      </div>
    </div>
  );
}

/**
 * Shared header of Lyrics and Queue (app: player-subheader.tsx): the cover folded into a title row, ⌄ back to Now
 * Playing, and a Lyrics / Queue switch that replaces the route (so Back still returns to Now Playing).
 */
export function SubHeader({ active }: { active: 'lyrics' | 'queue' }) {
  const { t } = useAppStrings();
  const track = usePlayerStore((s) => s.currentTrack());
  const goBack = useGoBack('/player/now-playing');
  useEscape(goBack);
  return (
    <header className="pl-subhead">
      <div className="pl-subhead-row">
        {track && <Artwork source={track.coverUri} className="pl-subhead-art" />}
        <div className="pl-subhead-text">
          {track && (
            <>
              <span className="t-label-lg ellipsis">{track.title}</span>
              <span className="t-body-sm ellipsis pl-medium">{track.artistName}</span>
            </>
          )}
        </div>
        <button type="button" className="pl-ghost" aria-label={t('collapsePlayerLabel')} onClick={goBack}>
          <Icon name="keyboard-arrow-down" size={28} />
        </button>
      </div>
      <nav className="pl-switch" aria-label={`${t('lyricsTab')} / ${t('queueTab')}`}>
        <SwitchLink to="/player/lyrics" label={t('lyricsTab')} selected={active === 'lyrics'} />
        <SwitchLink to="/player/queue" label={t('queueTab')} selected={active === 'queue'} />
      </nav>
    </header>
  );
}

function SwitchLink({ to, label, selected }: { to: string; label: string; selected: boolean }) {
  return (
    <Link to={to} replace className={selected ? 'pl-switch-tab on' : 'pl-switch-tab'} aria-current={selected ? 'page' : undefined}>
      {label}
    </Link>
  );
}

/** Full-screen frame: stage + content column. */
export function Screen({ cover, className, children }: { cover: LocalOrRemoteImage | undefined; className?: string; children: ReactNode }) {
  return (
    <div className={className ? `pl-screen ${className}` : 'pl-screen'}>
      <Stage cover={cover} />
      {children}
    </div>
  );
}
