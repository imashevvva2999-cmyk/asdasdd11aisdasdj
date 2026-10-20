// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import type { LocalOrRemoteImage } from '@mmusic/core/constants/stitch-artwork';
import type { AppStringKey } from '@mmusic/core/lib/i18n';
import { matchesQuery, normalizeQuery } from '@mmusic/core/lib/search-match';
import { nextSortMode, sortTracks, type TrackSortMode } from '@mmusic/core/lib/sort-tracks';
import { getAlbumById, getArtistById, getTrackById, type LibraryItem, type Playlist, type Track } from '@mmusic/core/mocks';
import { useLibraryStore } from '@mmusic/core/state/library-store';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { usePlaylistsStore } from '@mmusic/core/state/playlists-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Backdrop } from '@/components/Backdrop';
import { SectionHead } from '@/components/SectionHead';
import { useAppStrings } from '@/i18n/locale';
import { CoverCard, EmptyState, ListRow, Page, PageHeader } from '@/ui';

import { BrowseTrackList, PlayButtons, useBrowseToast, usePageTitle } from './shared';

const FILTERS = ['All', 'Playlists', 'Artists', 'Albums', 'Downloaded'] as const;
const FILTER_KEYS: Record<(typeof FILTERS)[number], AppStringKey> = { All: 'filterAll', Playlists: 'filterPlaylists', Artists: 'filterArtists', Albums: 'filterAlbums', Downloaded: 'filterDownloaded' };
const SORT_MODES = ['Recently Added', 'Alphabetical'] as const;
const SORT_KEYS: Record<(typeof SORT_MODES)[number], AppStringKey> = { 'Recently Added': 'recentlyAdded', Alphabetical: 'sortAlphabetical' };
export const TRACK_SORT_KEYS: Record<TrackSortMode, AppStringKey> = { 'Default order': 'sortDefaultOrderLabel', Title: 'titleLabel', Artist: 'artistLabel' };
const LIKED_SONGS_ID = 'liked-songs';

type Resolved = { item: LibraryItem; title: string; subtitle: string; cover?: LocalOrRemoteImage; round: boolean; fields: string[]; to: string };

function resolve(item: LibraryItem, playlists: Playlist[], t: (k: AppStringKey) => string): Resolved | undefined {
  const songs = (n: number) => `${n} ${n === 1 ? t('playlistSongSingular') : t('playlistSongPlural')}`;
  if (item.kind === 'playlist') {
    const p = playlists.find((pl) => pl.id === item.refId);
    if (!p) return undefined;
    return { item, title: p.title, subtitle: `${p.editorial ? t('editorialWordLabel') : t('playlistLabel')} • ${songs(p.trackCount)}`, cover: p.coverUri, round: false, fields: [p.title], to: `/playlist/${p.id}` };
  }
  if (item.kind === 'artist') {
    const a = getArtistById(item.refId);
    if (!a) return undefined;
    return { item, title: a.name, subtitle: `${t('artistLabel')}${a.monthlyListeners ? ` • ${(a.monthlyListeners / 1_000_000).toFixed(1)}M ${t('monthlyListenersSuffix')}` : ''}`, cover: a.photoUri, round: true, fields: [a.name], to: `/artist/${a.id}` };
  }
  const al = getAlbumById(item.refId);
  if (!al) return undefined;
  return { item, title: al.title, subtitle: `${t('albumTypeAlbum')} • ${al.artistName} • ${al.trackCount} ${t('trackCountPlural')}`, cover: al.coverUri, round: false, fields: [al.title, al.artistName], to: `/album/${al.id}` };
}

/** S-12 Your Library (mobile: (tabs)/library/index.tsx): filters, sort, list/grid, library search, Liked Songs. */
export function LibraryPage() {
  const { t } = useAppStrings();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [sortMode, setSortMode] = useState<(typeof SORT_MODES)[number]>('Recently Added');
  const [grid, setGrid] = useState(false);
  const [query, setQuery] = useState('');
  const q = normalizeQuery(query);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const items = useLibraryStore((s) => s.items);
  const downloadedIds = useLibraryStore((s) => s.downloadedIds);
  const playlists = usePlaylistsStore((s) => s.playlists);
  usePageTitle(t('yourLibrary'));

  const visible = useMemo(() => {
    const filtered = items.filter((item) => {
      if (filter === 'All') return true;
      if (filter === 'Downloaded') return downloadedIds.has(item.refId);
      return item.kind === (filter === 'Playlists' ? 'playlist' : filter === 'Artists' ? 'artist' : 'album');
    });
    const resolved = filtered.map((item) => resolve(item, playlists, t)).filter((r): r is Resolved => r !== undefined && matchesQuery(q, ...r.fields));
    return sortMode === 'Alphabetical' ? [...resolved].sort((a, b) => a.title.localeCompare(b.title)) : [...resolved].sort((a, b) => b.item.addedAt.localeCompare(a.item.addedAt));
  }, [items, downloadedIds, playlists, filter, sortMode, q, t]);

  const likedIds = Array.from(likedTrackIds);
  const matchedSongs: Track[] = q !== '' && filter === 'All' ? likedIds.map((id) => getTrackById(id)).filter((tr): tr is Track => tr !== undefined && matchesQuery(q, tr.title, tr.artistName)) : [];
  const showLiked = (filter === 'All' || filter === 'Playlists') && matchesQuery(q, 'Liked Songs', t('likedSongs'));
  const likedSub = `${t('playlistLabel')} • ${likedIds.length} ${likedIds.length === 1 ? t('playlistSongSingular') : t('playlistSongPlural')}`;
  const noMatches = q !== '' && visible.length === 0 && matchedSongs.length === 0 && !showLiked;

  return (
    <Page>
      <Backdrop />
      <PageHeader
        title={t('yourLibrary')}
        actions={
          <Link className="ui-btn small" to="/create-playlist">
            <Icon name="add" size={18} />
            {t('createPlaylistLabel')}
          </Link>
        }
      />
      <div className="ui-chips">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={f === filter ? 'ui-chip on' : 'ui-chip'} aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {t(FILTER_KEYS[f])}
          </button>
        ))}
      </div>
      <div className="br-toolbar">
        <button type="button" className="br-sort" onClick={() => setSortMode((m) => SORT_MODES[(SORT_MODES.indexOf(m) + 1) % SORT_MODES.length]!)}>
          <Icon name="swap-vert" size={18} />
          {t(SORT_KEYS[sortMode])}
        </button>
        <label className="br-lib-search">
          <Icon name="search" size={18} />
          <input type="search" value={query} placeholder={t('librarySearchPlaceholder')} aria-label={t('librarySearchPlaceholder')} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button type="button" className="icon-btn plain" aria-label={grid ? t('showAsListLabel') : t('showAsGridLabel')} title={grid ? t('showAsListLabel') : t('showAsGridLabel')} onClick={() => setGrid((g) => !g)}>
          <Icon name={grid ? 'view-agenda' : 'grid-view'} size={20} />
        </button>
      </div>

      {noMatches && <p className="br-hint medium">{`${t('libraryNoMatchesPrefix')} “${query.trim()}” ${t('libraryNoMatchesSuffix')}`}</p>}
      {!noMatches && visible.length === 0 && q === '' && !showLiked && <EmptyState icon="library-music" title={filter === 'Downloaded' ? t('libraryEmptyDownloaded') : t('libraryEmptyGeneric')} />}

      {grid ? (
        <div className="ui-grid">
          {showLiked && (
            <Link className="ui-card" to="/library/liked-songs">
              <span className="cover br-liked-cover">
                <Icon name="favorite" size={48} />
              </span>
              <span className="meta">
                <span className="t-label-lg ellipsis">{t('likedSongs')}</span>
                <span className="t-body-sm medium ellipsis">{likedSub}</span>
              </span>
            </Link>
          )}
          {visible.map((r) => (
            <CoverCard key={r.item.id} round={r.round} cover={r.cover} title={r.title} subtitle={r.subtitle} to={r.to} />
          ))}
        </div>
      ) : (
        (showLiked || visible.length > 0) && (
          <div className="ui-list">
            {showLiked && <ListRow icon="favorite" title={t('likedSongs')} subtitle={likedSub} to="/library/liked-songs" trail={<Icon name="chevron-right" size={20} />} />}
            {visible.map((r) => (
              <ListRow key={r.item.id} art={r.cover} round={r.round} title={r.title} subtitle={r.subtitle} to={r.to} trail={downloadedIds.has(r.item.refId) ? <Icon name="download-done" size={18} /> : <Icon name="chevron-right" size={20} />} />
            ))}
          </div>
        )
      )}

      {matchedSongs.length > 0 && (
        <section className="br-gap" aria-labelledby="br-lib-songs">
          <SectionHead id="br-lib-songs" title={t('songsHeader')} />
          <BrowseTrackList tracks={matchedSongs} queue={likedIds} />
        </section>
      )}
    </Page>
  );
}

/** S-13 Liked Songs (mobile: (tabs)/library/liked-songs.tsx) — live from the shared, persisted player store. */
export function LikedSongsPage() {
  const { t } = useAppStrings();
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const isDownloaded = useLibraryStore((s) => s.downloadedIds.has(LIKED_SONGS_ID));
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const [sortMode, setSortMode] = useState<TrackSortMode>('Default order');
  const { showToast, toast } = useBrowseToast();
  usePageTitle(t('likedSongs'));
  const liked = useMemo(
    () =>
      sortTracks(
        Array.from(likedTrackIds)
          .map((id) => getTrackById(id))
          .filter((tr): tr is Track => Boolean(tr)),
        sortMode,
      ),
    [likedTrackIds, sortMode],
  );
  const ids = liked.map((tr) => tr.id);

  return (
    <Page>
      <Backdrop />
      <PageHeader title="" back="/library" />
      <div className="detail-hero">
        <div className="cover br-liked-cover">
          <Icon name="favorite" size={88} />
        </div>
        <div>
          <span className="eyebrow">{t('autoPlaylistLabel')}</span>
          <h1>{t('likedSongs')}</h1>
          <p className="sub">
            {liked.length} {liked.length === 1 ? t('savedTrackSingular') : t('savedTrackPlural')}
          </p>
          <PlayButtons ids={ids}>
            <button
              type="button"
              className={isDownloaded ? 'icon-btn on' : 'icon-btn'}
              aria-pressed={isDownloaded}
              aria-label={isDownloaded ? t('removeDownloadLabel') : t('downloadOfflineLabel')}
              title={isDownloaded ? t('removeDownloadLabel') : t('downloadOfflineLabel')}
              onClick={() => {
                toggleDownloaded(LIKED_SONGS_ID);
                showToast(isDownloaded ? t('toastDownloadRemoved') : t('toastMarkedForOffline'), 'download');
              }}
            >
              <Icon name={isDownloaded ? 'download-done' : 'download'} size={20} />
            </button>
            <button type="button" className="ui-btn ghost small" onClick={() => setSortMode(nextSortMode(sortMode))}>
              <Icon name="swap-vert" size={16} />
              {t(TRACK_SORT_KEYS[sortMode])}
            </button>
          </PlayButtons>
        </div>
      </div>
      {liked.length === 0 ? <EmptyState icon="favorite-border" title={t('likedSongsEmptyTitle')} body={t('likedSongsEmptyHint')} /> : <BrowseTrackList tracks={liked} numbered />}
      {toast}
    </Page>
  );
}
