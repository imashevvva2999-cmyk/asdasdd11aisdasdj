// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';

import type { LocalOrRemoteImage } from '@mmusic/core/constants/stitch-artwork';
import type { Track, TrackId } from '@mmusic/core/mocks';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { audioUrlForTrack } from '@/assets/audio-assets';
import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';

import './ui.css';

/**
 * Shared website page primitives (W3 full-site sprint): the approved A3 look for every page. Pages compose these
 * with the shared @mmusic/core stores; nothing here owns business logic.
 */

export const formatDuration = (sec: number | undefined) => (sec === undefined ? '' : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`);
export const hasAudio = (trackId: TrackId) => audioUrlForTrack(trackId) !== undefined;

/** Page title row with an optional back button (history back, or a fallback route). */
export function PageHeader({ title, back, actions }: { title: string; back?: boolean | string; actions?: ReactNode }) {
  const navigate = useNavigate();
  const { t } = useAppStrings();
  const goBack = () => {
    if (typeof back === 'string') void navigate(back);
    else if (window.history.length > 1) void navigate(-1);
    else void navigate('/home');
  };
  return (
    <div className="page-header">
      {back && (
        <button type="button" className="icon-btn" aria-label={t('backLabel')} onClick={goBack}>
          <Icon name="arrow-back" size={22} />
        </button>
      )}
      <h1>{title}</h1>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

/** One playable track row: plays `queue` from this track through the shared player; optional like toggle. */
export function TrackRow({ track, queue, index, showArt = true, showLike = true }: { track: Track; queue: TrackId[]; index?: number; showArt?: boolean; showLike?: boolean }) {
  const { t } = useAppStrings();
  const play = usePlayerStore((s) => s.play);
  const active = usePlayerStore((s) => s.currentTrackId() === track.id && s.playback !== 'idle');
  const liked = usePlayerStore((s) => s.likedTrackIds.has(track.id));
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const playable = hasAudio(track.id);
  return (
    <div className={['ui-track', active && 'active', !playable && 'unavailable'].filter(Boolean).join(' ')}>
      <button type="button" className="main" aria-current={active ? 'true' : undefined} aria-label={`${track.title} — ${track.artistName}${playable ? '' : ` (${t('playUnavailableLabel')})`}`} onClick={() => play(track.id, queue)}>
        {index !== undefined && <span className="num">{index + 1}</span>}
        {showArt && <Artwork source={track.coverUri} className="art" />}
        <span className="t-text">
          <span className="t-label-lg t-title ellipsis">{track.title}</span>
          <span className="t-sub t-body-sm">
            <span className="ellipsis">{track.artistName}</span>
            {track.explicit && <span className="badge-e">E</span>}
          </span>
        </span>
        <span className="dur">{formatDuration(track.durationSec)}</span>
      </button>
      {showLike && (
        <button type="button" className={liked ? 'icon-btn plain on' : 'icon-btn plain'} aria-label={liked ? t('likedStateLabel') : t('likeLabel')} aria-pressed={liked} onClick={() => toggleLike(track.id)}>
          <Icon name={liked ? 'favorite' : 'favorite-border'} size={20} />
        </button>
      )}
    </div>
  );
}

export function TrackList({ tracks, showArt = true, numbered = false }: { tracks: Track[]; showArt?: boolean; numbered?: boolean }) {
  const ids = tracks.map((t) => t.id);
  return (
    <div className="ui-tracks">
      {tracks.map((track, i) => (
        <TrackRow key={`${track.id}-${i}`} track={track} queue={ids} index={numbered ? i : undefined} showArt={showArt} />
      ))}
    </div>
  );
}

type CardProps = { cover: LocalOrRemoteImage | undefined; title: string; subtitle?: string; meta?: string; round?: boolean } & ({ to: string } | { onClick: () => void });
/** Cover card (album, playlist, artist, genre) — a real link or action, never a dead tile. */
export function CoverCard(props: CardProps) {
  const body = (
    <>
      <span className="cover">
        <Artwork source={props.cover} />
      </span>
      <span className="meta">
        <span className="t-label-lg ellipsis">{props.title}</span>
        {props.subtitle && <span className="t-body-sm medium ellipsis">{props.subtitle}</span>}
        {props.meta && <span className="t-mono-num medium">{props.meta}</span>}
      </span>
    </>
  );
  const cls = props.round ? 'ui-card round' : 'ui-card';
  return 'to' in props ? (
    <Link className={cls} to={props.to}>
      {body}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={props.onClick}>
      {body}
    </button>
  );
}

/** List row: link, action or static. */
export function ListRow({ icon, art, round, title, subtitle, trail, to, onClick }: { icon?: IconName; art?: LocalOrRemoteImage; round?: boolean; title: string; subtitle?: string; trail?: ReactNode; to?: string; onClick?: () => void }) {
  const inner = (
    <>
      {icon && (
        <span className="lead">
          <Icon name={icon} size={20} />
        </span>
      )}
      {art !== undefined && <Artwork source={art} className={round ? 'art round' : 'art'} />}
      <span className="text">
        <span className="t-label-lg ellipsis">{title}</span>
        {subtitle && <span className="t-body-sm medium ellipsis">{subtitle}</span>}
      </span>
      {trail !== undefined && <span className="trail">{trail}</span>}
    </>
  );
  if (to) return <Link className="ui-row" to={to}>{inner}</Link>;
  if (onClick) return <button type="button" className="ui-row" onClick={onClick}>{inner}</button>;
  return <div className="ui-row static">{inner}</div>;
}

export function EmptyState({ icon, title, body, children }: { icon?: IconName; title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="ui-empty">
      {icon && <Icon name={icon} size={36} />}
      <span className="title">{title}</span>
      {body && <span className="t-body-md">{body}</span>}
      {children}
    </div>
  );
}

/** Standard page wrapper (keeps content above the Backdrop, leaves room for the mini-player). */
export function Page({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return <div className={narrow ? 'page narrow' : 'page'}>{children}</div>;
}
