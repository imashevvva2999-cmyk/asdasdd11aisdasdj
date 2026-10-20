// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import type { AppStringKey } from '@mmusic/core/lib/i18n';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { sampleImageChoices } from '@mmusic/core/constants/stitch-artwork';
import { curatedByLabel } from '@mmusic/core/lib/i18n';
import { nextSortMode, sortTracks, type TrackSortMode } from '@mmusic/core/lib/sort-tracks';
import { getAlbumById, getArtistById, getTrackById, playlistDurationLabel, type Album, type Artist, type Track } from '@mmusic/core/mocks';
import { useLibraryStore } from '@mmusic/core/state/library-store';
import { usePlaylistsStore } from '@mmusic/core/state/playlists-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { Backdrop } from '@/components/Backdrop';
import { SectionHead } from '@/components/SectionHead';
import { useAppStrings } from '@/i18n/locale';
import { CoverCard, EmptyState, Page, PageHeader } from '@/ui';

import { TRACK_SORT_KEYS } from './LibraryPages';
import { BrowseTrackList, formatListeners, PlayButtons, useBrowseToast, usePageTitle } from './shared';

const typeKey = (type: Album['type']) => (type === 'ep' ? 'albumTypeEp' : type === 'single' ? 'albumTypeSingle' : 'albumTypeAlbum') satisfies AppStringKey;
const isTrack = (tr: Track | undefined): tr is Track => tr !== undefined;

function NotFound({ message }: { message: string }) {
  const { t } = useAppStrings();
  return (
    <Page>
      <PageHeader title="" back />
      <EmptyState icon="search-off" title={message}>
        <Link className="ui-btn ghost small" to="/search">
          {t('searchTab')}
        </Link>
      </EmptyState>
    </Page>
  );
}

/** Library save + offline toggles shared by album and playlist (library store, like the mobile icons). */
function SaveButtons({ kind, id }: { kind: 'album' | 'playlist'; id: string }) {
  const { t } = useAppStrings();
  const saved = useLibraryStore((s) => s.items.some((i) => i.kind === kind && i.refId === id));
  const downloaded = useLibraryStore((s) => s.downloadedIds.has(id));
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const toggleDownloaded = useLibraryStore((s) => s.toggleDownloaded);
  const { showToast, toast } = useBrowseToast();
  const saveLabel = saved ? t(kind === 'album' ? 'removeAlbumFromLibrary' : 'removePlaylistFromLibrary') : t(kind === 'album' ? 'saveAlbum' : 'savePlaylist');
  return (
    <>
      <button
        type="button"
        className={saved ? 'icon-btn on' : 'icon-btn'}
        aria-pressed={saved}
        aria-label={saveLabel}
        title={saveLabel}
        onClick={() => {
          toggleSaved(kind, id);
          showToast(saved ? t('removedFromLibrary') : t('savedToLibrary'), 'check');
        }}
      >
        <Icon name={saved ? 'favorite' : 'favorite-border'} size={20} />
      </button>
      <button
        type="button"
        className={downloaded ? 'icon-btn on' : 'icon-btn'}
        aria-pressed={downloaded}
        aria-label={downloaded ? t('removeDownloadLabel') : t('download')}
        title={downloaded ? t('removeDownloadLabel') : t('download')}
        onClick={() => {
          toggleDownloaded(id, kind);
          showToast(downloaded ? t('toastDownloadRemoved') : t('toastMarkedForOffline'), 'download');
        }}
      >
        <Icon name={downloaded ? 'download-done' : 'download'} size={20} />
      </button>
      {toast}
    </>
  );
}

/** S-09 Album (mobile: album/[id].tsx). */
export function AlbumPage() {
  const { id = '' } = useParams();
  const { t } = useAppStrings();
  const album = getAlbumById(id);
  usePageTitle(album?.title ?? t('albumNotFoundMessage'));
  if (!album) return <NotFound message={t('albumNotFoundMessage')} />;
  const list = (album.trackIds ?? []).map((tid) => getTrackById(tid)).filter(isTrack);
  const count = list.length || album.trackCount;
  const artist = getArtistById(album.artistId);
  const more = artist?.releaseAlbumIds?.filter((aid) => aid !== album.id).map((aid) => getAlbumById(aid)).filter((a): a is Album => !!a) ?? [];
  return (
    <Page>
      <Backdrop />
      <PageHeader title="" back />
      <div className="detail-hero">
        <div className="cover">
          <Artwork source={album.coverUri} loading="eager" />
        </div>
        <div>
          <span className="eyebrow">{t(typeKey(album.type))}</span>
          <h1>{album.title}</h1>
          <p className="sub">
            <Link className="br-artist-link" to={`/artist/${album.artistId}`}>
              {album.artistName}
            </Link>
            {` • ${album.year} • ${count} ${count === 1 ? t('trackCountSingular') : t('trackCountPlural')}`}
          </p>
          <PlayButtons ids={list.map((tr) => tr.id)}>
            <SaveButtons kind="album" id={album.id} />
          </PlayButtons>
        </div>
      </div>
      <section aria-labelledby="br-al-tracks">
        <SectionHead id="br-al-tracks" title={t('tracksHeaderLabel')} />
        {list.length === 0 ? <EmptyState icon="library-music" title={t('noTracksAvailableMessage')} /> : <BrowseTrackList tracks={list} numbered showArt={false} />}
        <p className="br-foot medium t-body-sm">
          {t('releasedPrefix')} {album.year} · ℗ {album.year} {album.artistName}
        </p>
      </section>
      {more.length > 0 && (
        <section aria-labelledby="br-al-more">
          <SectionHead id="br-al-more" title={t('releasesSectionLabel')} />
          <div className="ui-grid">
            {more.map((a) => (
              <CoverCard key={a.id} cover={a.coverUri} title={a.title} subtitle={`${t(typeKey(a.type))} • ${a.year}`} to={`/album/${a.id}`} />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

/** S-08 Artist Profile (mobile: artist/[id].tsx): popular tracks, releases, fans also like, about, follow, support. */
export function ArtistPage() {
  const { id = '' } = useParams();
  const { t } = useAppStrings();
  const artist = getArtistById(id);
  const following = useLibraryStore((s) => s.items.some((i) => i.kind === 'artist' && i.refId === id));
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  usePageTitle(artist?.name ?? t('artistNotFoundLabel'));
  if (!artist) return <NotFound message={t('artistNotFoundLabel')} />;
  const popular = (artist.popularTrackIds ?? []).map((tid) => getTrackById(tid)).filter(isTrack);
  const releases = (artist.releaseAlbumIds ?? []).map((aid) => getAlbumById(aid)).filter((a): a is Album => !!a);
  const fans = (artist.fansAlsoLikeIds ?? []).map((aid) => getArtistById(aid)).filter((a): a is Artist => !!a);
  const meta = [artist.monthlyListeners !== undefined ? `${formatListeners(artist.monthlyListeners)} ${t('monthlyListenersSuffix')}` : undefined, artist.location].filter(Boolean).join(' • ');
  return (
    <Page>
      <Backdrop />
      <PageHeader title="" back />
      <div className="detail-hero">
        <div className="cover round">
          <Artwork source={artist.photoUri} loading="eager" />
        </div>
        <div>
          <span className="eyebrow">{t('artistLabel')}</span>
          <h1>
            {artist.name}
            {artist.verified && (
              <span className="br-verified" title="verified">
                <Icon name="verified" size={26} />
              </span>
            )}
          </h1>
          {meta && <p className="sub">{meta}</p>}
          <PlayButtons ids={popular.map((tr) => tr.id)}>
            <button type="button" className="ui-btn ghost" aria-pressed={following} onClick={() => toggleSaved('artist', artist.id)}>
              <Icon name={following ? 'check' : 'add'} size={18} />
              {following ? t('followingLabel') : t('followLabel')}
            </button>
            <Link className="ui-btn ghost" to={`/sheets/support?artistId=${encodeURIComponent(artist.id)}`}>
              <Icon name="volunteer-activism" size={18} />
              {t('supportArtistLabel')}
            </Link>
          </PlayButtons>
        </div>
      </div>
      {popular.length > 0 && (
        <section aria-labelledby="br-ar-pop">
          <SectionHead id="br-ar-pop" title={t('popularSectionLabel')} />
          <BrowseTrackList tracks={popular} numbered />
        </section>
      )}
      {releases.length > 0 && (
        <section aria-labelledby="br-ar-rel">
          <SectionHead id="br-ar-rel" title={t('releasesSectionLabel')} />
          <div className="ui-grid">
            {releases.map((a) => (
              <CoverCard key={a.id} cover={a.coverUri} title={a.title} subtitle={`${t(typeKey(a.type))} • ${a.year}`} to={`/album/${a.id}`} />
            ))}
          </div>
        </section>
      )}
      {fans.length > 0 && (
        <section aria-labelledby="br-ar-fans">
          <SectionHead id="br-ar-fans" title={t('fansAlsoLikeLabel')} />
          <div className="ui-grid br-grid-sm">
            {fans.map((a) => (
              <CoverCard key={a.id} round cover={a.photoUri} title={a.name} subtitle={t('artistLabel')} to={`/artist/${a.id}`} />
            ))}
          </div>
        </section>
      )}
      {artist.bio && (
        <section aria-labelledby="br-ar-about">
          <SectionHead id="br-ar-about" title={t('aboutSectionLabel')} />
          <div className="br-about">
            {(artist.location || artist.genres?.length) && <p className="br-about-meta">{[artist.location, artist.genres?.join(' · ')].filter(Boolean).join(' • ')}</p>}
            <p className="medium">{artist.bio}</p>
          </div>
        </section>
      )}
    </Page>
  );
}

/** S-10/S-11 Playlist (mobile: playlist/[id].tsx). Playlists the visitor created can also drop tracks. */
export function PlaylistPage() {
  const { id = '' } = useParams();
  const { t, locale } = useAppStrings();
  const playlist = usePlaylistsStore((s) => s.playlists.find((p) => p.id === id));
  const removeTrackFromPlaylist = usePlaylistsStore((s) => s.removeTrackFromPlaylist);
  const [sortMode, setSortMode] = useState<TrackSortMode>('Default order');
  const list = useMemo(() => sortTracks((playlist?.trackIds ?? []).map((tid) => getTrackById(tid)).filter(isTrack), sortMode), [playlist?.trackIds, sortMode]);
  usePageTitle(playlist?.title ?? t('playlistNotFoundMessage'));
  if (!playlist) return <NotFound message={t('playlistNotFoundMessage')} />;
  const own = !playlist.editorial && playlist.id.startsWith('user-playlist-');
  const dur = playlistDurationLabel(locale, playlist.id);
  return (
    <Page>
      <Backdrop />
      <PageHeader title="" back />
      <div className="detail-hero">
        <div className="cover">
          <Artwork source={playlist.coverUri} loading="eager" />
        </div>
        <div>
          <span className="eyebrow">{playlist.editorial ? t('editorialPlaylistLabel') : t('playlistLabel')}</span>
          <h1>{playlist.title}</h1>
          {playlist.description && <p className="sub">{playlist.description}</p>}
          <p className="sub">
            {playlist.curator ? curatedByLabel(locale, playlist.curator) : playlist.editorial ? t('mmusicEditorialLabel') : t('yourPlaylistLabel')}
            {` • ${list.length} ${list.length === 1 ? t('trackCountSingular') : t('trackCountPlural')}`}
            {list.length > 0 && dur ? ` • ${dur}` : ''}
          </p>
          <PlayButtons ids={list.map((tr) => tr.id)}>
            <SaveButtons kind="playlist" id={playlist.id} />
            {list.length > 1 && (
              <button type="button" className="ui-btn ghost small" onClick={() => setSortMode(nextSortMode(sortMode))}>
                <Icon name="sort" size={16} />
                {t(TRACK_SORT_KEYS[sortMode])}
              </button>
            )}
          </PlayButtons>
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState icon="queue-music" title={t('noTracksYetMessage')}>
          <Link className="ui-btn ghost small" to="/search">
            {t('searchTab')}
          </Link>
        </EmptyState>
      ) : (
        <BrowseTrackList tracks={list} numbered onRemove={own ? (tr) => removeTrackFromPlaylist(playlist.id, tr.id) : undefined} />
      )}
    </Page>
  );
}

const NAME_MAX = 50;

/** S-14 Create Playlist (mobile: create-playlist.tsx) — creates it in the playlists store, saves it to the Library, opens it. */
export function CreatePlaylistPage() {
  const { t } = useAppStrings();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTrackId = params.get('initialTrackId') ?? undefined;
  const initialTrack = initialTrackId ? getTrackById(initialTrackId) : undefined;
  const createPlaylist = usePlaylistsStore((s) => s.createPlaylist);
  const toggleSaved = useLibraryStore((s) => s.toggleSaved);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [coverIndex, setCoverIndex] = useState<number | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => nameRef.current?.focus(), []);
  usePageTitle(t('createPlaylistLabel'));
  const cover = coverIndex === null ? undefined : sampleImageChoices[coverIndex];
  const canCreate = name.trim().length > 0;
  const nextCover = () => setCoverIndex((c) => (c === null ? 0 : (c + 1) % sampleImageChoices.length));

  const create = () => {
    if (!canCreate) return;
    const playlist = createPlaylist({ title: name.trim(), description: description.trim() || undefined, coverUri: cover, isPublic, isCollaborative, initialTrackId: initialTrack?.id });
    toggleSaved('playlist', playlist.id);
    void navigate(`/playlist/${playlist.id}`, { replace: true });
  };

  return (
    <Page narrow>
      <Backdrop />
      <PageHeader title={t('createPlaylistLabel')} back="/library" />
      <form
        className="br-create"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <div className="br-cover-pick">
          <button type="button" className="br-cover-btn" aria-label={t('addCoverLabel')} onClick={nextCover}>
            {cover ? (
              <Artwork source={cover} />
            ) : (
              <span className="empty">
                <Icon name="add-photo-alternate" size={28} />
                <span className="t-label-md">{t('addCoverLabel')}</span>
                <span className="t-body-sm medium">{t('customArtOrPhotoHint')}</span>
              </span>
            )}
          </button>
          <button type="button" className="ui-btn ghost small" onClick={nextCover}>
            <Icon name="gradient" size={16} />
            {t('colorWaveLabel')}
          </button>
        </div>
        {initialTrack && (
          <p className="ui-notice">
            {t('newPlaylistAutoInsertSubtitle')}: {initialTrack.title} — {initialTrack.artistName}
          </p>
        )}
        <div className="ui-field">
          <label htmlFor="br-pl-name">
            {t('nameFieldLabel')} · {name.length}/{NAME_MAX}
          </label>
          <input id="br-pl-name" className="ui-input" ref={nameRef} maxLength={NAME_MAX} placeholder={t('playlistNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))} />
        </div>
        <div className="ui-field">
          <label htmlFor="br-pl-desc">
            {t('descriptionFieldLabel')} {t('optionalSuffixLabel')}
          </label>
          <textarea id="br-pl-desc" className="ui-input" rows={3} placeholder={t('vibePlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <label className="br-toggle">
          <span className="lead">
            <Icon name="public" size={20} />
          </span>
          <span className="text">
            <span className="t-label-lg">{t('publicPlaylistLabel')}</span>
            <span className="t-body-sm medium">{t('publicPlaylistSubtitle')}</span>
          </span>
          <input type="checkbox" role="switch" aria-checked={isPublic} checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        </label>
        <label className="br-toggle">
          <span className="lead">
            <Icon name="group-add" size={20} />
          </span>
          <span className="text">
            <span className="t-label-lg">{t('collaborativeLabel')}</span>
            <span className="t-body-sm medium">{t('collaborativeSubtitle')}</span>
          </span>
          <input type="checkbox" role="switch" aria-checked={isCollaborative} checked={isCollaborative} onChange={(e) => setIsCollaborative(e.target.checked)} />
        </label>
        <button type="submit" className="ui-btn br-cta" disabled={!canCreate}>
          {t('createPlaylistLabel')}
        </button>
      </form>
    </Page>
  );
}
