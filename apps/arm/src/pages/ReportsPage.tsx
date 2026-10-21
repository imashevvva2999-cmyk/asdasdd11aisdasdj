import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { formatNumber } from '@mmusic/backoffice/i18n';
import { useCollection } from '@mmusic/backoffice/react';
import { REVIEW_STATUS_LABELS, REVIEW_STATUSES } from '@mmusic/backoffice/review';
import { DemoBadge, PageHeader } from '@mmusic/backoffice/ui';
import { PROMO_TOOLS } from '@mmusic/core/mocks/promotions';

import { catalogAlbumRows, catalogArtists, catalogGenreRows, catalogPlaylistRows, catalogTrackRows } from '@/domain/catalog';
import { activityReport, campaignReport, moderationReport, paymentsByArtist, paymentsByStatus, toCsv } from '@/domain/reports';
import type { Campaign, DemoArtist, DemoTransaction, Submission, TransactionStatus } from '@/domain/types';
import { fill, type ArmStringKey } from '@/strings';
import { useArm } from '@/ui';

const TX_KEYS: Record<TransactionStatus, ArmStringKey> = { completed: 'txCompleted', pending: 'txPending', failed: 'txFailed' };

type Cell = string | number;

/** Saves a CSV in the browser (no upload, nothing leaves the machine). */
function downloadCsv(name: string, header: string[], rows: Cell[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(header, rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `mmusic-arm-${name}-demo.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function ReportCard({ id, title, header, rows, numeric = [] }: { id: string; title: string; header: string[]; rows: Cell[][]; numeric?: number[] }) {
  const { t } = useArm();
  return (
    <section className="bo-card" aria-labelledby={`report-${id}`} data-report={id} style={{ minWidth: 0 }}>
      <div className="bo-card-head">
        <h2 id={`report-${id}`} style={{ font: '700 18px/24px "Plus Jakarta Sans", system-ui, sans-serif' }}>
          {title}
        </h2>
        <button type="button" className="bo-btn ghost small" disabled={rows.length === 0} onClick={() => downloadCsv(id, header, rows)}>
          {t('exportCsv')}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="bo-muted">{t('noReportData')}</p>
      ) : (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                {header.map((h, i) => (
                  <th key={h} style={numeric.includes(i) ? { textAlign: 'right' } : undefined}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r[0])}>
                  {r.map((c, i) => (
                    <td key={header[i]} className={i === 0 ? undefined : 'muted'} style={numeric.includes(i) ? { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } : undefined}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Administrative reports (M3) over the prototype's demo data in this browser: moderation, campaign review, demo
 * donations, staff activity and catalog coverage. Each table can be saved as CSV. No revenue, plays or audiences.
 */
export function ReportsPage() {
  const { t, l, locale, roleLabel, actionText } = useArm();
  const subs = useCollection<Submission>('submissions');
  const campaigns = useCollection<Campaign>('campaigns');
  const txs = useCollection<DemoTransaction>('transactions');
  const artists = useCollection<DemoArtist>('artists');
  const events = useCollection<ActivityEvent>('activity');
  const n = (v: number) => formatNumber(v, locale);
  const kgs = (v: number) => fill(t('kgs'), { n: n(v) });
  const statusHead = REVIEW_STATUSES.map((s) => l(REVIEW_STATUS_LABELS[s]));
  const trackRows = catalogTrackRows();
  const playlistRows = catalogPlaylistRows();
  const approved = subs.filter((s) => s.status === 'approved');

  return (
    <>
      <PageHeader title={t('reportsTitle')} subtitle={t('reportsSubtitle')} actions={<DemoBadge />} />
      <div style={{ display: 'grid', gap: 16 }}>
        <ReportCard
          id="moderation"
          title={t('reportModeration')}
          header={[t('colKind'), t('colTotal'), ...statusHead, t('colMedianDecision')]}
          numeric={[1, 2, 3, 4, 5, 6]}
          rows={moderationReport(subs).map((r) => [r.kind === 'track' ? t('kindTrack') : t('kindRelease'), r.total, ...REVIEW_STATUSES.map((s) => r.counts[s]), r.medianDecisionHours === null ? '—' : fill(t('hours'), { n: n(Math.round(r.medianDecisionHours)) })])}
        />
        <ReportCard
          id="campaigns"
          title={t('reportCampaigns')}
          header={[t('colTool'), t('colTotal'), ...statusHead, t('colRequested')]}
          numeric={[1, 2, 3, 4, 5, 6]}
          rows={campaignReport(campaigns).map((r) => {
            const tool = PROMO_TOOLS.find((x) => x.id === r.toolId);
            return [tool ? l(tool.name) : r.toolId, r.total, ...REVIEW_STATUSES.map((s) => r.counts[s]), r.requestedBudgetKgs ? kgs(r.requestedBudgetKgs) : '—'];
          })}
        />
        <div className="bo-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', alignItems: 'start' }}>
          <ReportCard id="payments-status" title={t('reportPayments')} header={[t('colStatus'), t('colCount'), t('colSum')]} numeric={[1, 2]} rows={paymentsByStatus(txs).map((r) => [t(TX_KEYS[r.status]), r.count, kgs(r.amountKgs)])} />
          <ReportCard
            id="payments-artists"
            title={t('reportPaymentsByArtist')}
            header={[t('colRecipient'), t('colCount'), t('colSupporters'), t('colSum')]}
            numeric={[1, 2, 3]}
            rows={paymentsByArtist(txs).map((r) => [artists.find((a) => a.id === r.artistId)?.name ?? r.artistId, r.completedCount, r.supporters, kgs(r.completedKgs)])}
          />
        </div>
        <ReportCard
          id="activity"
          title={t('reportActivity')}
          header={[t('colRole'), t('colTotal'), t('colBreakdown')]}
          numeric={[1]}
          rows={activityReport(events).map((r) => [
            roleLabel(r.roleId),
            r.total,
            Object.entries(r.byVerb)
              .sort((a, b) => b[1] - a[1])
              .map(([verb, count]) => `${actionText(`.${verb}`)} ${count}`)
              .join(' · '),
          ])}
        />
        <ReportCard
          id="catalog"
          title={t('reportCatalog')}
          header={[t('colIndicator'), t('colValue'), t('colSource')]}
          numeric={[1]}
          rows={[
            [t('artists'), catalogArtists().length, t('sourceCatalog')],
            [t('albums'), catalogAlbumRows().length, t('sourceCatalog')],
            [t('tracks'), trackRows.length, t('sourceCatalog')],
            [t('reportTracksDemoAudio'), trackRows.filter((r) => r.audio === 'demo').length, t('sourceCatalog')],
            [t('reportTracksPendingAudio'), trackRows.filter((r) => r.audio === 'pending').length, t('sourceCatalog')],
            [t('genres'), catalogGenreRows().length, t('sourceCatalog')],
            [t('playlists'), playlistRows.length, t('sourceCatalog')],
            [t('reportEditorialPlaylists'), playlistRows.filter((p) => p.editorial).length, t('sourceCatalog')],
            [t('reportDemoListed'), approved.filter((s) => (s.listing ?? 'listed') === 'listed').length, t('sourceDemo')],
            [t('reportDemoUnlisted'), approved.filter((s) => s.listing === 'unlisted').length, t('sourceDemo')],
          ]}
        />
      </div>
    </>
  );
}
