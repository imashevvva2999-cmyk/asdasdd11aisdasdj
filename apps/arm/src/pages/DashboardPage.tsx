import { Link } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { formatNumber } from '@mmusic/backoffice/i18n';
import { useCan, useCollection } from '@mmusic/backoffice/react';
import { REVIEW_STATUS_LABELS, REVIEW_STATUSES } from '@mmusic/backoffice/review';
import { DemoBadge, KpiCard, PageHeader } from '@mmusic/backoffice/ui';
import { albums, artists as catalogArtistList, genres, playlists, tracks as catalogTracks } from '@mmusic/core/mocks';

import type { DemoArtist, Submission } from '@/domain/types';
import { countByStatus, type QueueCounts } from '@/domain/workflow';
import { entityPath, REVIEW_TONE, useArm } from '@/ui';

const cardTitle = { margin: 0, font: '700 18px/24px "Plus Jakarta Sans", system-ui, sans-serif' } as const;

function StatusBar({ label, counts }: { label: string; counts: QueueCounts }) {
  const { l } = useArm();
  const total = REVIEW_STATUSES.reduce((sum, s) => sum + counts[s], 0);
  return (
    <div className="bo-bar-row">
      <div className="bo-bar-head">
        <span>{label}</span>
        <span className="bo-muted">{total}</span>
      </div>
      <span className="bo-sr">{REVIEW_STATUSES.map((s) => `${l(REVIEW_STATUS_LABELS[s])}: ${counts[s]}`).join(', ')}</span>
      <div className="bo-bar" aria-hidden="true">
        {REVIEW_STATUSES.map((s) => (counts[s] > 0 ? <span key={s} className={REVIEW_TONE[s]} style={{ width: `${(counts[s] / Math.max(total, 1)) * 100}%` }} /> : null))}
      </div>
    </div>
  );
}

/**
 * ARM dashboard (M2): queue sizes and review status of the fictional demo submissions, recent audit events, and the
 * public demo-catalog counts. Every figure comes from the prototype's own data and is labelled — no platform metrics.
 */
export function DashboardPage() {
  const { t, l, locale, date, staffName, actionText } = useArm();
  const subs = useCollection<Submission>('submissions');
  const demoArtists = useCollection<DemoArtist>('artists');
  const events = useCollection<ActivityEvent>('activity');
  const canModeration = useCan('arm.moderation.view');
  const canArtists = useCan('arm.artists.view');
  const canActivity = useCan('arm.activity.view');
  const n = (value: number) => formatNumber(value, locale);
  const trackCounts = countByStatus(subs.filter((s) => s.kind === 'track'));
  const releaseCounts = countByStatus(subs.filter((s) => s.kind === 'release'));
  const artistCounts = countByStatus(demoArtists);
  const recent = [...events].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  const open = (to: string, allowed: boolean) => (allowed ? <Link to={to}>{t('openQueue')} →</Link> : undefined);

  return (
    <>
      <PageHeader title={t('dashboardTitle')} subtitle={t('dashboardSubtitle')} />

      <section className="bo-section" aria-label={t('statusOverview')}>
        <div className="bo-grid">
          <KpiCard icon="music-note" label={t('pendingTracks')} value={n(trackCounts.pending)} hint={t('kpiDemoHint')} demo footer={open('/moderation/tracks?status=pending', canModeration)} />
          <KpiCard icon="album" label={t('pendingReleases')} value={n(releaseCounts.pending)} hint={t('kpiDemoHint')} demo footer={open('/moderation/releases?status=pending', canModeration)} />
          <KpiCard icon="mic" label={t('pendingArtists')} value={n(artistCounts.pending)} hint={t('kpiDemoHint')} demo footer={open('/artists?source=demo&status=pending', canArtists)} />
          <KpiCard icon="history" label={t('loggedActions')} value={n(events.length)} hint={t('kpiLogHint')} demo footer={open('/activity', canActivity)} />
        </div>
      </section>

      <div className="bo-grid bo-section" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <section className="bo-card" aria-labelledby="arm-status">
          <div className="bo-card-head">
            <h2 id="arm-status" style={cardTitle}>
              {t('statusOverview')}
            </h2>
            <DemoBadge />
          </div>
          <div className="bo-bars">
            <StatusBar label={t('rowTracks')} counts={trackCounts} />
            <StatusBar label={t('rowReleases')} counts={releaseCounts} />
            <StatusBar label={t('rowArtists')} counts={artistCounts} />
            <div className="bo-legend">
              {REVIEW_STATUSES.map((s) => (
                <span key={s}>
                  <i className={REVIEW_TONE[s]} />
                  {l(REVIEW_STATUS_LABELS[s])}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="bo-card" aria-labelledby="arm-recent">
          <div className="bo-card-head">
            <h2 id="arm-recent" style={cardTitle}>
              {t('recentActivity')}
            </h2>
            {canActivity && (
              <Link className="bo-link" to="/activity" style={{ fontSize: 13 }}>
                {t('viewAllActivity')} →
              </Link>
            )}
          </div>
          {recent.length === 0 ? (
            <p className="bo-muted">{t('noActivity')}</p>
          ) : (
            <ul className="bo-list">
              {recent.map((e) => (
                <li key={e.id}>
                  <span className="grow">
                    <span className="bo-ellipsis">
                      {actionText(e.action)}:{' '}
                      <Link className="bo-link" to={entityPath(e.entity)}>
                        {e.entity.label}
                      </Link>
                    </span>
                    <span className="bo-muted bo-ellipsis" style={{ fontSize: 13 }}>
                      {staffName(e.actorId)} · {date(e.at)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="bo-section" aria-labelledby="arm-catalog">
        <h2 id="arm-catalog">{t('catalogTitle')}</h2>
        <div className="bo-grid">
          <KpiCard icon="mic" label={t('artists')} value={n(catalogArtistList.length)} hint={t('catalogHint')} demo />
          <KpiCard icon="album" label={t('albums')} value={n(albums.length)} hint={t('catalogHint')} demo />
          <KpiCard icon="music-note" label={t('tracks')} value={n(catalogTracks.length)} hint={t('catalogHint')} demo />
          <KpiCard icon="category" label={t('genres')} value={n(genres.length)} hint={t('catalogHint')} demo />
          <KpiCard icon="queue-music" label={t('playlists')} value={n(playlists.length)} hint={t('catalogHint')} demo />
        </div>
      </section>

      <section className="bo-card" aria-labelledby="arm-roadmap">
        <h2 id="arm-roadmap" style={{ ...cardTitle, marginBottom: 8 }}>
          {t('roadmapTitle')}
        </h2>
        <ul className="bo-list">
          {(['roadmapM3', 'roadmapM6'] as const).map((key) => (
            <li key={key} className="bo-muted">
              {t(key)}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
