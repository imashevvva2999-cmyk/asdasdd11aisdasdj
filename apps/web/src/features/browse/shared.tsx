// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { addedToPlaylistToast } from '@mmusic/core/lib/i18n';
import { playlistUpdatedLabel, type Track, type TrackId } from '@mmusic/core/mocks';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { usePlaylistsStore } from '@mmusic/core/state/playlists-store';
import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { useAppStrings } from '@/i18n/locale';
import { TrackRow } from '@/ui';

import { useBrowseStrings } from './strings';

import './browse.css';

/** Browser tab title in the approved "Page – Mmusic" format. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} – Mmusic`;
  }, [title]);
}

/** "N songs" with the shared singular/plural words. */
export function useSongCount() {
  const { t } = useAppStrings();
  return (n: number) => `${n} ${n === 1 ? t('playlistSongSingular') : t('playlistSongPlural')}`;
}

export function formatListeners(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
  return String(count);
}

/* ---------------------------------------------------------------------------------------------------------------
 * Local toast (the shared Toast provider is not mounted on the website): one short status line, announced politely.
 * ------------------------------------------------------------------------------------------------------------- */
export function useBrowseToast() {
  const [message, setMessage] = useState<{ text: string; icon?: IconName; key: number }>();
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((text: string, icon?: IconName) => {
    window.clearTimeout(timer.current);
    setMessage({ text, icon, key: Date.now() });
    timer.current = window.setTimeout(() => setMessage(undefined), 2400);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = (
    <output className="br-toast-region" aria-live="polite">
      {message && (
        <div key={message.key} className="br-toast">
          {message.icon && <Icon name={message.icon} size={18} />}
          <span>{message.text}</span>
        </div>
      )}
    </output>
  );
  return { showToast: show, toast: node };
}

/* ---------------------------------------------------------------------------------------------------------------
 * Track list with an "Add to playlist" action on every row (mobile: sheets/add-to-playlist.tsx).
 * ------------------------------------------------------------------------------------------------------------- */
export function BrowseTrackList({ tracks, queue, numbered = false, showArt = true, onRemove }: { tracks: Track[]; queue?: TrackId[]; numbered?: boolean; showArt?: boolean; onRemove?: (track: Track) => void }) {
  const { t } = useAppStrings();
  const ts = useBrowseStrings();
  const [pickFor, setPickFor] = useState<Track>();
  const ids = useMemo(() => queue ?? tracks.map((track) => track.id), [queue, tracks]);
  return (
    <>
      <div className="ui-tracks">
        {tracks.map((track, i) => (
          <div key={`${track.id}-${i}`} className="br-track">
            <TrackRow track={track} queue={ids} index={numbered ? i : undefined} showArt={showArt} />
            <button type="button" className="icon-btn plain br-add" aria-label={`${t('addToPlaylistTitle')}: ${track.title}`} title={t('addToPlaylistTitle')} onClick={() => setPickFor(track)}>
              <Icon name="playlist-add" size={20} />
            </button>
            {onRemove && (
              <button type="button" className="icon-btn plain br-add" aria-label={`${ts('removeFromPlaylist')}: ${track.title}`} title={ts('removeFromPlaylist')} onClick={() => onRemove(track)}>
                <Icon name="remove-circle-outline" size={20} />
              </button>
            )}
          </div>
        ))}
      </div>
      {pickFor && <AddToPlaylistDialog track={pickFor} onClose={() => setPickFor(undefined)} />}
    </>
  );
}

/** Modal playlist picker: toggles the track in each playlist (playlists store), or creates a new one with it. */
export function AddToPlaylistDialog({ track, onClose }: { track: Track; onClose: () => void }) {
  const { t, locale } = useAppStrings();
  const songCount = useSongCount();
  const ref = useRef<HTMLDialogElement>(null);
  const playlists = usePlaylistsStore((s) => s.playlists);
  const addTrackToPlaylist = usePlaylistsStore((s) => s.addTrackToPlaylist);
  const removeTrackFromPlaylist = usePlaylistsStore((s) => s.removeTrackFromPlaylist);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const q = query.trim().toLowerCase();
  const visible = q ? playlists.filter((p) => p.title.toLowerCase().includes(q)) : playlists;

  const toggle = (id: string, title: string, added: boolean) => {
    if (added) {
      removeTrackFromPlaylist(id, track.id);
      setNote('');
    } else {
      addTrackToPlaylist(id, track.id);
      setNote(addedToPlaylistToast(locale, title));
    }
  };

  return (
    <dialog
      ref={ref}
      className="br-dialog"
      aria-labelledby="br-atp-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="br-dialog-head">
        <div>
          <h2 id="br-atp-title">{t('addToPlaylistTitle')}</h2>
          <p className="t-body-sm medium">{t('addToPlaylistSubtitle')}</p>
        </div>
        <button type="button" className="icon-btn" aria-label={t('closeLabel')} onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="br-dialog-track">
        <Artwork source={track.coverUri} className="art" loading="eager" />
        <span className="text">
          <span className="t-label-lg ellipsis">{track.title}</span>
          <span className="t-body-sm medium ellipsis">{track.artistName}</span>
        </span>
      </div>
      <input className="ui-input br-dialog-search" type="search" placeholder={t('findPlaylistPlaceholder')} aria-label={t('findPlaylistPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="br-dialog-list ui-list">
        <Link className="ui-row" to={`/create-playlist?initialTrackId=${encodeURIComponent(track.id)}`} onClick={onClose}>
          <span className="lead">
            <Icon name="playlist-add" size={20} />
          </span>
          <span className="text">
            <span className="t-label-lg ellipsis">{t('newPlaylistLabel')}</span>
            <span className="t-body-sm medium ellipsis">{t('newPlaylistAutoInsertSubtitle')}</span>
          </span>
        </Link>
        {visible.map((playlist) => {
          const added = (playlist.trackIds ?? []).includes(track.id);
          const updated = playlistUpdatedLabel(locale, playlist.id);
          return (
            <button key={playlist.id} type="button" className="ui-row" aria-pressed={added} onClick={() => toggle(playlist.id, playlist.title, added)}>
              <Artwork source={playlist.coverUri} className="art" loading="eager" />
              <span className="text">
                <span className="t-label-lg ellipsis">{playlist.title}</span>
                <span className="t-body-sm medium ellipsis">
                  {songCount(playlist.trackCount)}
                  {updated ? ` • ${updated}` : ''}
                </span>
              </span>
              <span className={added ? 'br-check on' : 'br-check'} aria-hidden="true">
                {added && <Icon name="check" size={16} />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="br-dialog-note t-body-sm" aria-live="polite">
        {note && `✓ ${note}`}
      </p>
      <button type="button" className="ui-btn ghost br-dialog-done" onClick={onClose}>
        {t('doneLabel')}
      </button>
    </dialog>
  );
}

/** Play all + shuffle buttons used by every collection page. */
export function PlayButtons({ ids, children }: { ids: TrackId[]; children?: ReactNode }) {
  const { t } = useAppStrings();
  const play = usePlayerStore((s) => s.play);
  const playShuffled = usePlayerStore((s) => s.playShuffled);
  const empty = ids.length === 0;
  return (
    <div className="buttons">
      <button type="button" className="ui-btn" disabled={empty} onClick={() => !empty && play(ids[0]!, ids)}>
        <Icon name="play-arrow" size={20} />
        {t('playAllLabel')}
      </button>
      <button type="button" className="icon-btn" aria-label={t('shuffleLabel')} title={t('shuffleLabel')} disabled={empty} onClick={() => !empty && playShuffled(ids)}>
        <Icon name="shuffle" size={20} />
      </button>
      {children}
    </div>
  );
}
