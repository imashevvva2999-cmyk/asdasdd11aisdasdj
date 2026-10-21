import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { formatNumber } from '@mmusic/backoffice/i18n';
import { useCollection } from '@mmusic/backoffice/react';
import { BackLink, DemoBadge, DetailList, EmptyState, FilterBar, FilterSelect, KpiCard, PageHeader, PermissionNote, SearchField, StatusBadge, type StatusTone } from '@mmusic/backoffice/ui';

import { useArmCan } from '@/access';
import { paymentsByStatus, TRANSACTION_STATUSES } from '@/domain/reports';
import type { DemoArtist, DemoTransaction, DemoUser, TransactionStatus } from '@/domain/types';
import { fill, type ArmStringKey } from '@/strings';
import { matches, useArm, useQueryState } from '@/ui';

const TX_KEYS: Record<TransactionStatus, ArmStringKey> = { completed: 'txCompleted', pending: 'txPending', failed: 'txFailed' };
const TX_TONE: Record<TransactionStatus, StatusTone> = { completed: 'success', pending: 'pending', failed: 'danger' };

export function TransactionBadge({ status }: { status: TransactionStatus }) {
  const { t } = useArm();
  return <StatusBadge tone={TX_TONE[status]} label={t(TX_KEYS[status])} />;
}

/** "1 000 сом" / "1,000 KGS". */
export function useKgs() {
  const { t, locale } = useArm();
  return (n: number) => fill(t('kgs'), { n: formatNumber(n, locale) });
}

function usePeople() {
  const users = useCollection<DemoUser>('users');
  const artists = useCollection<DemoArtist>('artists');
  return {
    payer: (id: string) => users.find((u) => u.id === id)?.name ?? '—',
    recipient: (id: string) => artists.find((a) => a.id === id)?.name ?? '—',
    artists,
  };
}

/**
 * Payments overview (M3): fictional fan donations to fictional demo artists, view only. No action here creates,
 * changes, refunds or sends money; no platform fee is shown (OQ-10); payer accounts are masked.
 */
export function PaymentsPage() {
  const { t, date } = useArm();
  const kgs = useKgs();
  const { payer, recipient, artists } = usePeople();
  const txs = useCollection<DemoTransaction>('transactions');
  const query = useQueryState();
  const q = query.get('q');
  const status = query.get('status');
  const artist = query.get('artist');
  const summary = paymentsByStatus(txs);
  const byStatus = (status: TransactionStatus) => summary.find((r) => r.status === status) ?? { count: 0, amountKgs: 0 };
  const rows = txs
    .filter((x) => (!status || x.status === status) && (!artist || x.recipientArtistId === artist) && (!q || matches(`${x.reference} ${payer(x.payerUserId)} ${recipient(x.recipientArtistId)}`, q)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recipients = [...new Set(txs.map((x) => x.recipientArtistId))];

  return (
    <>
      <PageHeader title={t('paymentsTitle')} subtitle={t('paymentsSubtitle')} actions={<DemoBadge />} />
      <section className="bo-section" aria-label={t('paymentsTitle')}>
        <div className="bo-grid">
          <KpiCard icon="check-circle-outline" label={t('kpiCompletedCount')} value={String(byStatus('completed').count)} hint={t('kpiTxHint')} demo />
          <KpiCard icon="payments" label={t('kpiCompletedSum')} value={kgs(byStatus('completed').amountKgs)} hint={t('kpiTxHint')} demo />
          <KpiCard icon="schedule" label={t('kpiPendingTx')} value={String(byStatus('pending').count)} hint={t('kpiTxHint')} demo />
          <KpiCard icon="error-outline" label={t('kpiFailedTx')} value={String(byStatus('failed').count)} hint={t('kpiTxHint')} demo />
        </div>
      </section>
      <div style={{ marginBottom: 12 }}>
        <PermissionNote icon="lock-outline" text={t('paymentsReadOnlyNote')} />
      </div>
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: txs.length })}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchPayments')} />
        <FilterSelect label={t('filterStatus')} value={status} onChange={(v) => query.set('status', v)} options={[{ value: '', label: '—' }, ...TRANSACTION_STATUSES.map((s) => ({ value: s, label: t(TX_KEYS[s]) }))]} />
        <FilterSelect label={t('filterRecipient')} value={artist} onChange={(v) => query.set('artist', v)} options={[{ value: '', label: '—' }, ...recipients.map((id) => ({ value: id, label: artists.find((a) => a.id === id)?.name ?? id }))]} />
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
                <th>{t('colReference')}</th>
                <th>{t('colDate')}</th>
                <th>{t('colPayer')}</th>
                <th>{t('colRecipient')}</th>
                <th style={{ textAlign: 'right' }}>{t('colAmount')}</th>
                <th>{t('colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td className="nowrap">
                    <Link className="bo-link" to={`/payments/${x.id}`}>
                      {x.reference}
                    </Link>
                  </td>
                  <td className="muted nowrap">{date(x.createdAt)}</td>
                  <td className="muted">{payer(x.payerUserId)}</td>
                  <td className="muted">{recipient(x.recipientArtistId)}</td>
                  <td className="nowrap" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {kgs(x.amountKgs)}
                  </td>
                  <td>
                    <TransactionBadge status={x.status} />
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

/** One demo transaction, view only. */
export function PaymentDetailPage() {
  const { id = '' } = useParams();
  const { t, l, date } = useArm();
  const kgs = useKgs();
  const { payer, recipient } = usePeople();
  const canUsers = useArmCan('arm.users.view');
  const canArtists = useArmCan('arm.artists.view');
  const tx = useCollection<DemoTransaction>('transactions').find((x) => x.id === id);
  const back = <BackLink to="/payments" label={t('backToPayments')} />;

  if (!tx) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('transactionNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const details: [string, ReactNode][] = [
    [t('fieldTxKind'), t('kindDonation')],
    [t('fieldAmount'), kgs(tx.amountKgs)],
    [t('fieldStatus'), <TransactionBadge key="s" status={tx.status} />],
    ...(tx.failureReason ? ([[t('fieldFailure'), l(tx.failureReason)]] as [string, ReactNode][]) : []),
    [t('fieldCreated'), date(tx.createdAt)],
    [t('fieldPayer'), canUsers ? <Link key="p" className="bo-link" to={`/users/${tx.payerUserId}`}>{payer(tx.payerUserId)}</Link> : payer(tx.payerUserId)],
    [t('fieldAccount'), `MBANK ${tx.accountMask}`],
    [t('fieldRecipient'), canArtists ? <Link key="r" className="bo-link" to={`/artists/${tx.recipientArtistId}`}>{recipient(tx.recipientArtistId)}</Link> : recipient(tx.recipientArtistId)],
    [t('fieldFee'), t('feeNotDecided')],
  ];

  return (
    <>
      {back}
      <PageHeader
        title={fill(t('transactionTitle'), { ref: tx.reference })}
        subtitle={`${t('kindDonation')} · ${kgs(tx.amountKgs)}`}
        actions={
          <>
            <TransactionBadge status={tx.status} />
            <DemoBadge />
          </>
        }
      />
      <section className="bo-card" aria-label={t('detailsTitle')} style={{ maxWidth: 760 }}>
        <div className="bo-card-head">
          <h2>{t('detailsTitle')}</h2>
          <StatusBadge tone="neutral" label={t('readOnly')} />
        </div>
        <DetailList items={details} />
        <div style={{ marginTop: 12 }}>
          <PermissionNote icon="lock-outline" text={t('paymentsReadOnlyNote')} />
        </div>
      </section>
    </>
  );
}
