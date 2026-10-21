import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useCollection } from '@mmusic/backoffice/react';
import type { ReviewStatus } from '@mmusic/backoffice/review';
import { BackLink, DemoBadge, DetailList, EmptyState, FilterBar, FilterSelect, PageHeader, PermissionNote, SearchField, StatusBadge } from '@mmusic/backoffice/ui';

import { useArmActions } from '@/data/actions';
import { catalogArtists, type CatalogArtist } from '@/domain/catalog';
import type { DemoArtist, Submission } from '@/domain/types';
import { fill } from '@/strings';
import { DecisionPanel, EventTable, matches, ReviewBadge, useArm, useQueryState } from '@/ui';

type StatusKey = ReviewStatus | 'catalog-verified' | 'catalog-none';
type Row = { id: string; name: string; source: 'demo' | 'catalog'; genres: string[]; city: string; status: StatusKey; linked: number };

function CatalogMark({ verified }: { verified: boolean }) {
  const { t } = useArm();
  return <StatusBadge tone={verified ? 'success' : 'neutral'} label={verified ? t('catalogVerified') : t('catalogNoMark')} />;
}

function SourceBadge({ source }: { source: Row['source'] }) {
  const { t } = useArm();
  return source === 'demo' ? <DemoBadge /> : <StatusBadge tone="neutral" label={t('sourceCatalog')} />;
}

/** Artists: fictional demo applications (reviewable) + catalog artists (public metadata, read-only). */
export function ArtistsPage() {
  const { t } = useArm();
  const demo = useCollection<DemoArtist>('artists');
  const subs = useCollection<Submission>('submissions');
  const catalog = useMemo(() => catalogArtists(), []);
  const query = useQueryState();
  const q = query.get('q');
  const source = query.get('source');
  const status = query.get('status');

  const all: Row[] = [
    ...demo.map((a) => ({ id: a.id, name: a.name, source: 'demo' as const, genres: a.genres, city: a.city, status: a.status as StatusKey, linked: subs.filter((s) => s.artistId === a.id).length })),
    ...catalog.map((a) => ({ id: a.id, name: a.name, source: 'catalog' as const, genres: a.genres, city: a.location ?? '—', status: (a.verified ? 'catalog-verified' : 'catalog-none') as StatusKey, linked: a.tracks.length + a.releases.length })),
  ];
  const rows = all
    .filter((r) => (!source || r.source === source) && (!status || r.status === status) && (!q || matches(`${r.name} ${r.genres.join(' ')} ${r.city}`, q)))
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || Number(a.source === 'catalog') - Number(b.source === 'catalog') || a.name.localeCompare(b.name));
  const statusOptions: { value: StatusKey | ''; label: string }[] = [
    { value: '', label: '—' },
    { value: 'pending', label: t('artistPending') },
    { value: 'approved', label: t('artistApproved') },
    { value: 'changes-requested', label: t('artistChanges') },
    { value: 'rejected', label: t('artistRejected') },
    { value: 'catalog-verified', label: t('catalogVerified') },
    { value: 'catalog-none', label: t('catalogNoMark') },
  ];

  return (
    <>
      <PageHeader title={t('artistsTitle')} subtitle={t('artistsSubtitle')} />
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: all.length })}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchArtists')} />
        <FilterSelect label={t('filterSource')} value={source} onChange={(v) => query.set('source', v)} options={[{ value: '', label: '—' }, { value: 'demo', label: t('sourceDemo') }, { value: 'catalog', label: t('sourceCatalog') }]} />
        <FilterSelect label={t('filterVerification')} value={status} onChange={(v) => query.set('status', v)} options={statusOptions} />
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState icon="search-off" title={t('emptyFiltered')} body={t('emptyFilteredHint')}>
          <button type="button" className="bo-btn ghost" onClick={query.clear}>
            {t('clearFilters')}
          </button>
        </EmptyState>
      ) : (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th>{t('colName')}</th>
                <th>{t('colSource')}</th>
                <th>{t('colGenres')}</th>
                <th>{t('colCity')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colLinked')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.source}-${r.id}`}>
                  <td>
                    <Link className="bo-link" to={`/artists/${r.id}`}>
                      {r.name}
                    </Link>
                  </td>
                  <td>
                    <SourceBadge source={r.source} />
                  </td>
                  <td className="muted">{r.genres.join(', ') || '—'}</td>
                  <td className="muted">{r.city}</td>
                  <td>{r.source === 'demo' ? <ReviewBadge status={r.status as ReviewStatus} artist /> : <CatalogMark verified={r.status === 'catalog-verified'} />}</td>
                  <td className="muted">{r.linked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function ArtistDetailPage() {
  const { id = '' } = useParams();
  const { t } = useArm();
  const demo = useCollection<DemoArtist>('artists');
  const catalog = useMemo(() => catalogArtists(), []);
  const artist = demo.find((a) => a.id === id);
  const catalogArtist = artist ? undefined : catalog.find((a) => a.id === id);
  if (artist) return <DemoArtistDetail artist={artist} />;
  if (catalogArtist) return <CatalogArtistDetail artist={catalogArtist} />;
  return (
    <>
      <BackLink to="/artists" label={t('backToArtists')} />
      <EmptyState icon="search-off" title={t('artistNotFound')} body={t('notFoundHint')} />
    </>
  );
}

function DemoArtistDetail({ artist }: { artist: DemoArtist }) {
  const { t, l, date, staffName } = useArm();
  const actions = useArmActions();
  const subs = useCollection<Submission>('submissions').filter((s) => s.artistId === artist.id);
  const events = useCollection<ActivityEvent>('activity');
  const related = new Set([artist.id, ...subs.map((s) => s.id)]);
  const details: [string, ReactNode][] = [
    [t('fieldSource'), <DemoBadge key="d" />],
    [t('fieldGenres'), artist.genres.join(', ')],
    [t('fieldCity'), artist.city],
    [t('fieldSubmitted'), date(artist.submittedAt)],
    [t('fieldVerification'), <ReviewBadge key="s" status={artist.status} artist />],
    ...(artist.decidedAt ? ([[t('fieldDecided'), `${date(artist.decidedAt)} · ${staffName(artist.decidedBy)}`]] as [string, ReactNode][]) : []),
    ...(artist.reason ? ([[t('fieldReason'), <p key="r" className="bo-quote" style={{ margin: 0 }}>{artist.reason}</p>]] as [string, ReactNode][]) : []),
    [t('fieldBio'), l(artist.bio)],
  ];

  return (
    <>
      <BackLink to="/artists" label={t('backToArtists')} />
      <PageHeader
        title={artist.name}
        subtitle={artist.city}
        actions={
          <>
            <ReviewBadge status={artist.status} artist />
            <DemoBadge />
          </>
        }
      />
      <div className="bo-detail-grid">
        <section className="bo-card" aria-label={t('detailsTitle')}>
          <h2>{t('detailsTitle')}</h2>
          <DetailList items={details} />
        </section>
        <DecisionPanel heading={t('verificationTitle')} title={artist.name} status={artist.status} permission="arm.artists.edit" artist hint={t('verificationHint')} onDecide={(d, r) => actions.reviewArtist(artist.id, d, r)} />
      </div>
      <section className="bo-section" aria-label={t('linkedSubmissions')}>
        <h2>{t('linkedSubmissions')}</h2>
        {subs.length === 0 ? (
          <p className="bo-muted">{t('noLinked')}</p>
        ) : (
          <div className="bo-table-wrap">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>{t('colTitle')}</th>
                  <th>{t('colType')}</th>
                  <th>{t('colGenre')}</th>
                  <th>{t('colSubmitted')}</th>
                  <th>{t('colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link className="bo-link" to={`/moderation/${s.kind === 'track' ? 'tracks' : 'releases'}/${s.id}`}>
                        {s.title}
                      </Link>
                    </td>
                    <td className="muted">{s.kind === 'track' ? t('kindTrack') : t('kindRelease')}</td>
                    <td className="muted">{s.genre}</td>
                    <td className="muted nowrap">{date(s.submittedAt)}</td>
                    <td>
                      <ReviewBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="bo-section" aria-label={t('reviewHistory')}>
        <h2>{t('reviewHistory')}</h2>
        <EventTable events={events.filter((e) => related.has(e.entity.id))} />
      </section>
    </>
  );
}

function CatalogArtistDetail({ artist }: { artist: CatalogArtist }) {
  const { t } = useArm();
  const releaseType = (type: CatalogArtist['releases'][number]['type']) => (type === 'single' ? t('releaseSingle') : type === 'ep' ? t('releaseEp') : t('releaseAlbum'));
  return (
    <>
      <BackLink to="/artists" label={t('backToArtists')} />
      <PageHeader title={artist.name} subtitle={artist.location} actions={<CatalogMark verified={artist.verified} />} />
      <div className="bo-card" style={{ marginBottom: 16 }}>
        <PermissionNote text={t('catalogNote')} />
      </div>
      <div className="bo-detail-grid">
        <section className="bo-card" aria-label={t('detailsTitle')}>
          <h2>{t('detailsTitle')}</h2>
          <DetailList
            items={[
              [t('fieldSource'), t('sourceCatalog')],
              [t('fieldGenres'), artist.genres.join(', ') || '—'],
              [t('fieldCity'), artist.location ?? '—'],
              [t('fieldVerification'), <CatalogMark key="m" verified={artist.verified} />],
            ]}
          />
        </section>
        <section className="bo-card" aria-label={t('linkedCatalog')}>
          <h2>{t('linkedCatalog')}</h2>
          {artist.tracks.length + artist.releases.length === 0 ? (
            <p className="bo-muted">{t('noLinked')}</p>
          ) : (
            <ul className="bo-list">
              {artist.releases.map((r) => (
                <li key={r.id}>
                  <span className="grow">
                    <span>{r.title}</span>
                    <span className="bo-muted" style={{ fontSize: 13 }}>
                      {releaseType(r.type)} · {r.year} · {r.trackCount} {t('fieldTrackCount').toLowerCase()}
                    </span>
                  </span>
                </li>
              ))}
              {artist.tracks.map((tr) => (
                <li key={tr.id}>
                  <span className="grow">
                    <span>{tr.title}</span>
                    <span className="bo-muted" style={{ fontSize: 13 }}>
                      {t('kindTrack')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
