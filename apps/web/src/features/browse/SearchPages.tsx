// First: configures @mmusic/core storage before the persisted player store is used.
import '@/platform/storage';

import type { AppStringKey } from '@mmusic/core/lib/i18n';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { getTrackIdsForGenre } from '@mmusic/core/lib/genre-tracks';
import { genreFollowToggleToast, genreNameLabel, genreTagLabel, playArtistTopTracksLabel } from '@mmusic/core/lib/i18n';
import { matchesQuery, normalizeQuery } from '@mmusic/core/lib/search-match';
import { albums, artists, featuredGenre, genreDescriptionsRu, genreDetails, genres, getGenreById, getTrackById, initialRecentSearches, playlistDurationLabel, tracks, trendingSearches, type Album, type Genre, type Track } from '@mmusic/core/mocks';
import { useLibraryStore } from '@mmusic/core/state/library-store';
import { usePlayerStore } from '@mmusic/core/state/player-store';
import { usePlaylistsStore } from '@mmusic/core/state/playlists-store';
import { Icon } from '@mmusic/ui-kit/web';

import { Artwork } from '@/components/Artwork';
import { Backdrop } from '@/components/Backdrop';
import { SectionHead } from '@/components/SectionHead';
import { useAppStrings } from '@/i18n/locale';
import { CoverCard, EmptyState, ListRow, Page, PageHeader } from '@/ui';

import { BrowseTrackList, formatListeners, PlayButtons, useBrowseToast, usePageTitle, useSongCount } from './shared';

const albumTypeKey = (type: Album['type']) => (type === 'ep' ? 'albumTypeEp' : type === 'single' ? 'albumTypeSingle' : 'albumTypeAlbum') satisfies AppStringKey;
const resultsUrl = (q: string) => (q.trim() ? `/search/results?q=${encodeURIComponent(q.trim())}` : '/search/results');

function GenreTile({ genre, numbered }: { genre: Genre; numbered?: boolean }) {
  const { locale } = useAppStrings();
  return (
    <Link className="br-genre" to={`/search/genre/${genre.id}`}>
      <Artwork source={genre.coverUri} />
      <span className="shade" />
      {numbered && genre.number !== undefined && <span className="num t-mono-num">{String(genre.number).padStart(2, '0')}</span>}
      <span className="label">{genreNameLabel(locale, genre.id)}</span>
    </Link>
  );
}

function FeaturedBanner({ tall }: { tall?: boolean }) {
  const { locale } = useAppStrings();
  return (
    <Link className={tall ? 'br-banner tall' : 'br-banner'} to={`/search/genre/${featuredGenre.id}`}>
      <Artwork source={featuredGenre.coverUri} />
      <span className="shade" />
      <span className="text">
        <span className="title">{genreNameLabel(locale, featuredGenre.id)}</span>
        {featuredGenre.subtitle && <span className="t-body-sm">{locale === 'ru' ? genreDescriptionsRu[featuredGenre.id] : featuredGenre.subtitle}</span>}
      </span>
    </Link>
  );
}

/** S-03 Search / Explore (mobile: (tabs)/search/index.tsx). */
export function SearchPage() {
  const { t } = useAppStrings();
  const navigate = useNavigate();
  const [recent, setRecent] = useState(initialRecentSearches);
  const [draft, setDraft] = useState('');
  usePageTitle(t('searchTab'));

  return (
    <Page>
      <Backdrop />
      <PageHeader title={t('searchTab')} />
      <form
        className="br-search"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate(resultsUrl(draft));
        }}
      >
        <Icon name="search" size={22} />
        <input
          type="search"
          value={draft}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) void navigate(resultsUrl(e.target.value));
          }}
        />
      </form>

      {recent.length > 0 && (
        <section aria-labelledby="br-recent">
          <div className="br-row-head">
            <h2 id="br-recent" className="br-eyebrow">
              {t('recentSearches')}
            </h2>
            <button type="button" className="br-link" onClick={() => setRecent([])}>
              {t('clearAll')}
            </button>
          </div>
          <div className="br-chips">
            {recent.map((query) => (
              <span key={query} className="br-chip">
                <Link to={resultsUrl(query)}>{query}</Link>
                <button type="button" aria-label={`${t('clearAll')}: ${query}`} onClick={() => setRecent((prev) => prev.filter((q) => q !== query))}>
                  <Icon name="close" size={14} />
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="br-trending">
        <SectionHead id="br-trending" title={t('trendingSearches')} />
        <div className="br-ranked">
          {trendingSearches.map((item, index) => (
            <Link key={item.query} className="br-rank" to={resultsUrl(item.query)}>
              <span className="n">{index + 1}</span>
              <span className="text">
                <span className="t-label-lg ellipsis">{item.query}</span>
                <span className="t-body-sm medium ellipsis">{item.meta}</span>
              </span>
              <Icon name="north-east" size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="br-browse">
        <SectionHead id="br-browse" title={t('browseAll')} action={{ label: t('allGenresTitle'), to: '/search/all-genres' }} />
        <FeaturedBanner />
        <div className="br-genres">
          {genres.map((genre) => (
            <GenreTile key={genre.id} genre={genre} />
          ))}
        </div>
      </section>
    </Page>
  );
}

const RESULT_FILTERS = ['All', 'Songs', 'Artists', 'Albums', 'Playlists'] as const;
const RESULT_FILTER_KEYS = { All: 'filterAll', Songs: 'songsHeader', Artists: 'filterArtists', Albums: 'filterAlbums', Playlists: 'filterPlaylists' } as const;

/** S-04 Search Results / S-05 empty search (mobile: (tabs)/search/results.tsx) — same matching rule. */
export function SearchResultsPage() {
  const { t, locale } = useAppStrings();
  const songCount = useSongCount();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [filter, setFilter] = useState<(typeof RESULT_FILTERS)[number]>('All');
  const playlists = usePlaylistsStore((s) => s.playlists);
  const play = usePlayerStore((s) => s.play);
  usePageTitle(t('searchTab'));

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const setQuery = (q: string) => setParams(q ? { q } : {}, { replace: true });
  const q = normalizeQuery(query);
  const matchedArtists = useMemo(() => artists.filter((a) => matchesQuery(q, a.name)), [q]);
  const matchedTracks = useMemo(() => tracks.filter((tr) => matchesQuery(q, tr.title, tr.artistName)), [q]);
  const matchedAlbums = useMemo(() => albums.filter((a) => matchesQuery(q, a.title, a.artistName)), [q]);
  const matchedPlaylists = useMemo(() => playlists.filter((p) => matchesQuery(q, p.title)), [q, playlists]);
  const top = matchedArtists[0];
  const hasAny = matchedArtists.length + matchedTracks.length + matchedAlbums.length + matchedPlaylists.length > 0;
  const topQueue = top ? (top.popularTrackIds?.length ? top.popularTrackIds : tracks.filter((tr) => tr.artistId === top.id).map((tr) => tr.id)) : [];
  const show = (f: (typeof RESULT_FILTERS)[number]) => filter === 'All' || filter === f;

  return (
    <Page>
      <Backdrop />
      <PageHeader title={t('searchTab')} back="/search" />
      <form className="br-search" onSubmit={(e) => e.preventDefault()}>
        <Icon name="search" size={22} />
        <input ref={inputRef} type="search" value={query} placeholder={t('searchResultsPlaceholder')} aria-label={t('searchResultsPlaceholder')} onChange={(e) => setQuery(e.target.value)} />
        {query && (
          <button type="button" className="icon-btn plain" aria-label={t('searchClearLabel')} onClick={() => setQuery('')}>
            <Icon name="close" size={18} />
          </button>
        )}
      </form>
      <div className="ui-chips">
        {RESULT_FILTERS.map((f) => (
          <button key={f} type="button" className={f === filter ? 'ui-chip on' : 'ui-chip'} aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {t(RESULT_FILTER_KEYS[f])}
          </button>
        ))}
      </div>

      {q === '' || !hasAny ? (
        <>
          {q === '' ? (
            <EmptyState icon="search" title={t('searchEmptyTitle')} body={t('searchEmptyHint')}>
              <Link className="ui-btn ghost small" to="/search/all-genres">
                {t('exploreAllGenres')}
              </Link>
            </EmptyState>
          ) : (
            <EmptyState icon="search-off" title={`${t('searchNoResultsPrefix')} “${query}”`} body={t('searchNoResultsHint')}>
              <Link className="ui-btn ghost small" to="/search/all-genres">
                {t('exploreAllGenres')}
              </Link>
            </EmptyState>
          )}
          <section className="br-trend-chips" aria-labelledby="br-trend-now">
            <h2 id="br-trend-now" className="br-eyebrow">
              {t('genreTrendingNow')}
            </h2>
            <div className="ui-chips">
              {trendingSearches.map((item) => (
                <button key={item.query} type="button" className="ui-chip" onClick={() => setQuery(item.query)}>
                  {item.query}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          {show('Artists') && top && (
            <section aria-labelledby="br-top">
              <SectionHead id="br-top" title={t('searchTopResult')} />
              <div className="br-top">
                <Link className="br-top-link" to={`/artist/${top.id}`}>
                  <Artwork source={top.photoUri} className="art round" />
                  <span className="text">
                    <span className="name">
                      {top.name}
                      {top.verified && (
                        <span className="br-verified">
                          <Icon name="verified" size={18} />
                        </span>
                      )}
                    </span>
                    <span className="t-body-sm medium">
                      {t('artistLabel')}
                      {top.monthlyListeners ? ` • ${formatListeners(top.monthlyListeners)} ${t('monthlyListenersSuffix')}` : ''}
                    </span>
                  </span>
                </Link>
                {topQueue.length > 0 && (
                  <button type="button" className="br-play" aria-label={playArtistTopTracksLabel(locale, top.name)} onClick={() => play(topQueue[0]!, topQueue)}>
                    <Icon name="play-arrow" size={26} />
                  </button>
                )}
              </div>
            </section>
          )}
          {show('Songs') && matchedTracks.length > 0 && (
            <section aria-labelledby="br-songs">
              <SectionHead id="br-songs" title={t('songsHeader')} />
              <BrowseTrackList tracks={matchedTracks} />
            </section>
          )}
          {show('Artists') && matchedArtists.length > 0 && (
            <section aria-labelledby="br-artists">
              <SectionHead id="br-artists" title={t('filterArtists')} />
              <div className="ui-grid br-grid-sm">
                {matchedArtists.map((a) => (
                  <CoverCard key={a.id} round cover={a.photoUri} title={a.name} subtitle={t('artistLabel')} to={`/artist/${a.id}`} />
                ))}
              </div>
            </section>
          )}
          {show('Albums') && matchedAlbums.length > 0 && (
            <section aria-labelledby="br-albums">
              <SectionHead id="br-albums" title={t('searchAlbumsHeader')} />
              <div className="ui-grid">
                {matchedAlbums.map((a) => (
                  <CoverCard key={a.id} cover={a.coverUri} title={a.title} subtitle={`${a.year} • ${t(albumTypeKey(a.type))}`} to={`/album/${a.id}`} />
                ))}
              </div>
            </section>
          )}
          {show('Playlists') && matchedPlaylists.length > 0 && (
            <section aria-labelledby="br-playlists">
              <SectionHead id="br-playlists" title={t('searchFeaturedPlaylists')} />
              <div className="ui-list">
                {matchedPlaylists.map((p) => {
                  const dur = playlistDurationLabel(locale, p.id);
                  return <ListRow key={p.id} art={p.coverUri} title={p.title} subtitle={`${p.editorial ? `${t('officialPlaylistLabel')} • ` : ''}${t('playlistLabel')} • ${songCount(p.trackCount)}${dur ? ` • ${dur}` : ''}`} to={`/playlist/${p.id}`} trail={<Icon name="chevron-right" size={20} />} />;
                })}
              </div>
            </section>
          )}
          {!(
            (show('Artists') && matchedArtists.length > 0) ||
            (show('Songs') && matchedTracks.length > 0) ||
            (show('Albums') && matchedAlbums.length > 0) ||
            (show('Playlists') && matchedPlaylists.length > 0)
          ) && <EmptyState icon="search-off" title={`${t('searchNoResultsPrefix')} “${query}”`} body={t('searchNoResultsHint')} />}
        </>
      )}
    </Page>
  );
}

const GENRE_FILTERS = ['All', 'Genres', 'Moods & Activities', 'Regional & Heritage'] as const;
const GENRE_FILTER_KEYS = { All: 'filterAll', Genres: 'filterGenres', 'Moods & Activities': 'filterMoodsActivities', 'Regional & Heritage': 'filterRegionalHeritage' } as const;

/** S-06 All Genres & Moods (mobile: (tabs)/search/all-genres.tsx). The chips filter by each category's own kind
 * (genreDetails label), so none of them is decorative. */
export function AllGenresPage() {
  const { t } = useAppStrings();
  const [filter, setFilter] = useState<(typeof GENRE_FILTERS)[number]>('All');
  usePageTitle(t('allGenresTitle'));
  const kind = (g: Genre) => genreDetails[g.id]?.label;
  const visible = genres.filter((g) => {
    if (filter === 'All') return true;
    if (filter === 'Genres') return kind(g) === 'Genre';
    if (filter === 'Moods & Activities') return kind(g) === 'Mood';
    return kind(g) === 'Regional';
  });
  return (
    <Page>
      <Backdrop />
      <PageHeader title={t('allGenresTitle')} back="/search" />
      <p className="br-lede medium">{t('allGenresSubtitle')}</p>
      <div className="ui-chips">
        {GENRE_FILTERS.map((f) => (
          <button key={f} type="button" className={f === filter ? 'ui-chip on' : 'ui-chip'} aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {t(GENRE_FILTER_KEYS[f])}
          </button>
        ))}
      </div>
      {(filter === 'All' || filter === 'Regional & Heritage') && <FeaturedBanner tall />}
      <section aria-labelledby="br-realms">
        <SectionHead id="br-realms" title={`${t('curatedRealmsTitle')} · ${visible.length}`} />
        {visible.length === 0 ? (
          <EmptyState icon="library-music" title={t('genreNoTracksTitle')} />
        ) : (
          <div className="br-genres big">
            {visible.map((genre) => (
              <GenreTile key={genre.id} genre={genre} numbered />
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}

/** S-07 Genre detail (mobile: (tabs)/search/genre/[id].tsx). */
export function GenrePage() {
  const { id = '' } = useParams();
  const { t, locale } = useAppStrings();
  const genre = getGenreById(id);
  const detail = genreDetails[id];
  const followed = useLibraryStore((s) => s.followedGenreIds.has(id));
  const toggleGenreFollowed = useLibraryStore((s) => s.toggleGenreFollowed);
  const { showToast, toast } = useBrowseToast();
  const title = detail?.heroTitle ?? (genre ? genreNameLabel(locale, genre.id) : t('genreFallback'));
  usePageTitle(genre ? genreNameLabel(locale, genre.id) : t('genreFallback'));

  const trending = getTrackIdsForGenre(id)
    .map((trackId) => getTrackById(trackId))
    .filter((tr): tr is Track => tr !== undefined);
  const ids = trending.map((tr) => tr.id);

  if (!genre) {
    return (
      <Page>
        <PageHeader title={t('genreFallback')} back="/search" />
        <EmptyState icon="search-off" title={t('genreFallback')}>
          <Link className="ui-btn ghost small" to="/search/all-genres">
            {t('exploreAllGenres')}
          </Link>
        </EmptyState>
      </Page>
    );
  }
  return (
    <Page>
      <Backdrop />
      <PageHeader title="" back="/search" />
      <div className="detail-hero">
        <div className="cover">
          <Artwork source={genre.coverUri} loading="eager" />
        </div>
        <div>
          {detail && <span className="eyebrow">{genreTagLabel(locale, detail.label)}</span>}
          <h1>{title}</h1>
          {detail && <p className="sub">{locale === 'ru' ? (genreDescriptionsRu[id] ?? detail.description) : detail.description}</p>}
          <PlayButtons ids={ids}>
            <button
              type="button"
              className="ui-btn ghost"
              aria-pressed={followed}
              onClick={() => {
                toggleGenreFollowed(id);
                showToast(genreFollowToggleToast(locale, followed, genreNameLabel(locale, genre.id)), 'check');
              }}
            >
              <Icon name={followed ? 'check' : 'add'} size={18} />
              {followed ? t('followingLabel') : t('followLabel')}
            </button>
          </PlayButtons>
        </div>
      </div>

      <section aria-labelledby="br-gtracks">
        {trending.length === 0 ? (
          <EmptyState icon="library-music" title={t('genreNoTracksTitle')} body={t('genreNoTracksHint')} />
        ) : (
          <>
            <SectionHead id="br-gtracks" title={`${t('genreTopPrefix')} ${trending.length}`} />
            <p className="br-sub medium">{t('genreTracksSubtitle')}</p>
            <BrowseTrackList tracks={trending} numbered />
          </>
        )}
      </section>

      <section aria-labelledby="br-gcomp">
        <SectionHead id="br-gcomp" title={t('genreCompilationsTitle')} />
        <p className="br-sub medium">{t('genreCompilationsSubtitle')}</p>
        <div className="ui-grid">
          {albums.slice(0, 4).map((a) => (
            <CoverCard key={a.id} cover={a.coverUri} title={a.title} subtitle={`${a.trackCount} ${t('tracksCountSuffix')}`} to={`/album/${a.id}`} />
          ))}
        </div>
      </section>

      <section aria-labelledby="br-gart">
        <SectionHead id="br-gart" title={t('genrePioneeringArtistsTitle')} />
        <p className="br-sub medium">{t('genrePioneeringArtistsSubtitle')}</p>
        <div className="ui-grid br-grid-sm">
          {artists.slice(0, 4).map((a) => (
            <CoverCard key={a.id} round cover={a.photoUri} title={a.name} subtitle={a.monthlyListeners ? `${(a.monthlyListeners / 1_000_000).toFixed(1)}M ${t('fansSuffix')}` : undefined} to={`/artist/${a.id}`} />
          ))}
        </div>
      </section>

      <section aria-labelledby="br-gnew">
        <SectionHead id="br-gnew" title={t('newReleases')} />
        <p className="br-sub medium">{t('recentReleasesSubtitle')}</p>
        <div className="ui-grid">
          {albums.slice(3, 6).map((a) => (
            <CoverCard key={a.id} cover={a.coverUri} title={a.title} subtitle={a.artistName} to={`/album/${a.id}`} />
          ))}
        </div>
      </section>
      {toast}
    </Page>
  );
}
