import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { Icon } from '@mmusic/ui-kit/web';

import { clampSeek, formatClock, previewErrorKind, type PreviewError } from '@/domain/audio';
import type { ArmStringKey } from '@/strings';
import { useArm } from '@/ui';

import './audio-preview.css';

type PlayState = 'idle' | 'loading' | 'playing' | 'paused';

const ERROR_KEYS: Record<PreviewError, ArmStringKey> = {
  unsupported: 'audioErrorUnsupported',
  network: 'audioErrorNetwork',
  decode: 'audioErrorDecode',
  blocked: 'audioErrorBlocked',
  unknown: 'audioErrorUnknown',
};

/**
 * Compact moderation audio preview: play / pause, seek, current time / duration, volume and mute. ARM-local — its own
 * <audio> element, nothing shared with the public Mmusic player. Without `src` (no real file of this recording) it
 * says so and stays disabled. Changing `src` or leaving the page pauses and releases the media.
 */
export function AudioPreview({ src, title }: { src?: string; title: string }) {
  // A new source is a new player: the old <audio> is paused and released by its own unmount cleanup.
  return <Player key={src ?? 'none'} src={src} title={title} />;
}

function Player({ src, title }: { src?: string; title: string }) {
  const { t } = useArm();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<PlayState>('idle');
  const [error, setError] = useState<PreviewError | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  // Attach the file on mount; leaving the page or switching track (remount) stops and releases it. The setup
  // re-attaches because a remount of the same element (React StrictMode in development) runs cleanup + setup again.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (audio.getAttribute('src') !== src) {
      audio.src = src;
      audio.load();
    }
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  if (!src) {
    return (
      <fieldset className="arm-player disabled" aria-label={t('previewTitle')}>
        <button type="button" className="arm-play" disabled aria-label={t('audioPlay')}>
          <Icon name="play-arrow" size={24} />
        </button>
        <div className="arm-track">
          <div className="arm-meta">
            <span className="arm-title bo-ellipsis">{title}</span>
            <span className="arm-time">0:00 / 0:00</span>
          </div>
          <p className="arm-unavailable">
            <Icon name="music-off" size={16} />
            <span>
              <strong>{t('audioUnavailable')}</strong> · {t('audioUnavailableHint')}
            </span>
          </p>
        </div>
      </fieldset>
    );
  }

  const playing = state === 'playing';
  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (error) {
      setError(null);
      audio.load();
    }
    setState('loading');
    try {
      await audio.play();
    } catch (e) {
      const name = e instanceof DOMException ? e.name : undefined;
      if (name === 'AbortError') return; // superseded by a newer request (e.g. track change)
      setState('paused');
      setError(previewErrorKind({ playErrorName: name, mediaErrorCode: audio.error?.code }));
    }
  };
  const fill = duration > 0 ? `${(time / duration) * 100}%` : '0%';

  return (
    <div className="arm-preview">
      <fieldset className="arm-player" aria-label={t('previewTitle')} data-state={state}>
        <audio
          ref={audioRef}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onPlaying={() => setState('playing')}
          onWaiting={() => setState('loading')}
          onPause={() => setState('paused')}
          onEnded={() => setState('paused')}
          onError={(e) => {
            setState('idle');
            setError(previewErrorKind({ mediaErrorCode: e.currentTarget.error?.code }));
          }}
        >
          {/* No caption file exists for preview recordings; the empty track satisfies the media accessibility rule. */}
          <track kind="captions" />
        </audio>
        <button type="button" className="arm-play" aria-label={playing ? t('audioPause') : t('audioPlay')} aria-busy={state === 'loading'} onClick={() => void toggle()}>
          {state === 'loading' ? <span className="arm-spinner" aria-hidden="true" /> : <Icon name={playing ? 'pause' : 'play-arrow'} size={24} />}
        </button>
        <div className="arm-track">
          <div className="arm-meta">
            <span className="arm-title bo-ellipsis">{title}</span>
            <span className="arm-time">
              {state === 'loading' && duration === 0 ? t('audioLoading') : `${formatClock(time)} / ${formatClock(duration)}`}
            </span>
          </div>
          <input
            type="range"
            className="arm-range arm-seek"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            disabled={!duration}
            aria-label={t('audioSeek')}
            aria-valuetext={`${formatClock(time)} / ${formatClock(duration)}`}
            style={{ '--fill': fill } as CSSProperties}
            onChange={(e) => {
              const audio = audioRef.current;
              if (!audio) return;
              const next = clampSeek(Number(e.target.value), duration);
              audio.currentTime = next;
              setTime(next);
            }}
          />
        </div>
        <div className="arm-volume">
          <button type="button" className="arm-icon" aria-label={muted ? t('audioUnmute') : t('audioMute')} aria-pressed={muted} onClick={() => setMuted((m) => !m)}>
            <Icon name={muted || volume === 0 ? 'volume-off' : 'volume-up'} size={20} />
          </button>
          <input
            type="range"
            className="arm-range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            aria-label={t('audioVolume')}
            style={{ '--fill': `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              setMuted(false);
            }}
          />
        </div>
      </fieldset>
      {error && (
        <p className="bo-field-error arm-player-error" role="alert">
          {t(ERROR_KEYS[error])}{' '}
          <button type="button" className="arm-retry" onClick={() => void toggle()}>
            {t('audioRetry')}
          </button>
        </p>
      )}
    </div>
  );
}
