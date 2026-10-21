import type { ReactNode } from 'react';
import { Link, NavLink, useParams } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useCollection } from '@mmusic/backoffice/react';
import { REVIEW_STATUS_LABELS, REVIEW_STATUSES } from '@mmusic/backoffice/review';
import { BackLink, DemoBadge, DetailList, EmptyState, FilterBar, FilterSelect, PageHeader, SearchField } from '@mmusic/backoffice/ui';

import { AudioPreview } from '@/components/AudioPreview';
import { useArmActions } from '@/data/actions';
import { audioCreditFor, audioForSubmission } from '@/domain/audio';
import { catalogArtistName } from '@/domain/catalog';
import type { DemoArtist, Submission, SubmissionKind } from '@/domain/types';
import { sortQueue } from '@/domain/workflow';
import { fill } from '@/strings';
import { DecisionPanel, EventTable, formatDuration, ListingBadge, matches, ReviewBadge, useArm, useQueryState } from '@/ui';

const RELEASE_TYPE_KEYS = { single: 'releaseSingle', ep: 'releaseEp', album: 'releaseAlbum' } as const;

function ModerationTabs() {
  const { t } = useArm();
  const subs = useCollection<Submission>('submissions');
  const pending = (kind: SubmissionKind) => subs.filter((s) => s.kind === kind && s.status === 'pending').length;
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'bo-tab active' : 'bo-tab');
  return (
    <nav className="bo-tabs" aria-label={t('moderationTitle')}>
      <NavLink to="/moderation/tracks" className={cls}>
        {t('tabTracks')}
        <span className="count" title={t('pendingTracks')}>
          {pending('track')}
        </span>
      </NavLink>
      <NavLink to="/moderation/releases" className={cls}>
        {t('tabReleases')}
        <span className="count" title={t('pendingReleases')}>
          {pending('release')}
        </span>
      </NavLink>
    </nav>
  );
}

/** Track or release moderation queue: search (title / artist), status and genre filters kept in the URL. */
export function ModerationListPage({ kind }: { kind: SubmissionKind }) {
  const { t, l, date } = useArm();
  const subs = useCollection<Submission>('submissions');
  const artists = useCollection<DemoArtist>('artists');
  const query = useQueryState();
  const q = query.get('q');
  const status = query.get('status');
  const genre = query.get('genre');
  const artistName = (id: string) => artists.find((a) => a.id === id)?.name ?? catalogArtistName(id) ?? '—';
  const ofKind = subs.filter((s) => s.kind === kind);
  const rows = sortQueue(ofKind.filter((s) => (!status || s.status === status) && (!genre || s.genre === genre) && (!q || matches(`${s.title} ${artistName(s.artistId)}`, q))));
  const genres = [...new Set(ofKind.map((s) => s.genre))].sort();
  const base = kind === 'track' ? '/moderation/tracks' : '/moderation/releases';

  return (
    <>
      <PageHeader title={t('moderationTitle')} subtitle={t('moderationSubtitle')} actions={<DemoBadge />} />
      <ModerationTabs />
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: ofKind.length })}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchSubmissions')} />
        <FilterSelect label={t('filterStatus')} value={status} onChange={(v) => query.set('status', v)} options={[{ value: '', label: '—' }, ...REVIEW_STATUSES.map((st) => ({ value: st, label: l(REVIEW_STATUS_LABELS[st]) }))]} />
        <FilterSelect label={t('filterGenre')} value={genre} onChange={(v) => query.set('genre', v)} options={[{ value: '', label: '—' }, ...genres.map((g) => ({ value: g, label: g }))]} />
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
                <th>{t('colTitle')}</th>
                <th>{t('colArtist')}</th>
                <th>{kind === 'release' ? t('colType') : t('fieldDuration')}</th>
                <th>{t('colGenre')}</th>
                <th>{t('colSubmitted')}</th>
                <th>{t('colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link className="bo-link" to={`${base}/${s.id}`}>
                      {s.title}
                    </Link>
                    {s.catalogTrackId && (
                      <span className="bo-status neutral" style={{ marginLeft: 8 }}>
                        {t('demoWithAudio')}
                      </span>
                    )}
                    {s.explicit && (
                      <span className="bo-status neutral" style={{ marginLeft: 8 }} title={t('explicit')}>
                        E
                      </span>
                    )}
                  </td>
                  <td className="muted">{artistName(s.artistId)}</td>
                  <td className="muted nowrap">{s.releaseType ? `${t(RELEASE_TYPE_KEYS[s.releaseType])} · ${s.trackCount ?? '—'}` : formatDuration(s.durationSec)}</td>
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
    </>
  );
}

/** One submission: metadata, the moderator decision panel and its history. */
export function ModerationDetailPage({ kind }: { kind: SubmissionKind }) {
  const { id = '' } = useParams();
  const { t, l, date, staffName } = useArm();
  const actions = useArmActions();
  const subs = useCollection<Submission>('submissions');
  const artists = useCollection<DemoArtist>('artists');
  const events = useCollection<ActivityEvent>('activity');
  const sub = subs.find((s) => s.id === id && s.kind === kind);
  const back = kind === 'track' ? <BackLink to="/moderation/tracks" label={t('backToTracks')} /> : <BackLink to="/moderation/releases" label={t('backToReleases')} />;

  if (!sub) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('submissionNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const demoArtist = artists.find((a) => a.id === sub.artistId);
  // A demo submission built on a catalog track names the catalog artist (read-only catalog page, no decision attached).
  const catalogName = demoArtist ? undefined : catalogArtistName(sub.artistId);
  const artist = demoArtist ?? (catalogName ? { id: sub.artistId, name: catalogName } : undefined);
  const credit = audioCreditFor(sub.id);
  const details: [string, ReactNode][] = [
    [t('fieldArtist'), artist ? <Link key="artist" className="bo-link" to={`/artists/${artist.id}`}>{artist.name}</Link> : '—'],
    ...(sub.catalogTrackId ? ([[t('fieldSource'), fill(t('sourceCatalogTrack'), { title: sub.title })]] as [string, ReactNode][]) : []),
    [t('fieldKind'), kind === 'track' ? t('kindTrack') : t('kindRelease')],
    [t('fieldGenre'), sub.genre],
    ...(kind === 'track'
      ? ([[t('fieldDuration'), formatDuration(sub.durationSec)]] as [string, ReactNode][])
      : ([
          [t('fieldReleaseType'), sub.releaseType ? t(RELEASE_TYPE_KEYS[sub.releaseType]) : '—'],
          [t('fieldTrackCount'), String(sub.trackCount ?? '—')],
        ] as [string, ReactNode][])),
    [t('explicit'), sub.explicit ? t('yes') : t('no')],
    [t('fieldSubmitted'), date(sub.submittedAt)],
    [t('fieldStatus'), <ReviewBadge key="s" status={sub.status} />],
    ...(sub.status === 'approved' ? ([[t('fieldListing'), <ListingBadge key="l" status={sub.listing ?? 'listed'} />]] as [string, ReactNode][]) : []),
    ...(sub.decidedAt ? ([[t('fieldDecided'), `${date(sub.decidedAt)} · ${staffName(sub.decidedBy)}`]] as [string, ReactNode][]) : []),
    ...(sub.reason ? ([[t('fieldReason'), <p key="r" className="bo-quote" style={{ margin: 0 }}>{sub.reason}</p>]] as [string, ReactNode][]) : []),
    ...(sub.note ? ([[t('fieldNote'), l(sub.note)]] as [string, ReactNode][]) : []),
  ];

  return (
    <>
      {back}
      <PageHeader
        title={sub.title}
        subtitle={artist?.name}
        actions={
          <>
            <ReviewBadge status={sub.status} />
            <DemoBadge />
          </>
        }
      />
      <div className="bo-detail-grid">
        <section className="bo-card" aria-label={t('detailsTitle')}>
          <h2>{t('detailsTitle')}</h2>
          <DetailList items={details} />
        </section>
        <DecisionPanel
          heading={t('decisionTitle')}
          title={sub.title}
          status={sub.status}
          permission="arm.moderation.decide"
          hint={t('decisionPendingHint')}
          preview={
            kind === 'track' ? (
              <>
                <AudioPreview src={audioForSubmission(sub.id, sub.kind)} title={sub.title} />
                {credit && <p className="arm-credit">{fill(t('audioCredit'), { credit })}</p>}
              </>
            ) : undefined
          }
          onDecide={(d, r) => actions.decideSubmission(sub.id, d, r)}
        />
      </div>
      <section className="bo-section" aria-label={t('historyTitle')}>
        <h2>{t('historyTitle')}</h2>
        <EventTable events={events.filter((e) => e.entity.id === sub.id)} showEntity={false} />
      </section>
    </>
  );
}
