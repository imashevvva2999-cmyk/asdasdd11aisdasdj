import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useCan, useCollection } from '@mmusic/backoffice/react';
import { BackLink, ConfirmDialog, DemoBadge, DetailList, EmptyState, PageHeader, PermissionNote } from '@mmusic/backoffice/ui';

import { useCrmActions } from '@/data/actions';
import { dealOutcome } from '@/domain/pipeline';
import { isOverdueTask } from '@/domain/tasks';
import { OPEN_STAGES, type CrmContact, type CrmOrganization, type Deal, type DealStage, type Task } from '@/domain/types';
import { DEAL_STAGE_KEYS, fill } from '@/strings';
import { AuditTable, DealStageBadge, SelectField, TaskStatusBadge, useCrm, useNow, ViewOnly } from '@/ui';

type Pending = { to: DealStage; kind: 'move' | 'won' | 'lost' | 'reopen' };

/** One deal: details, stage transitions (won / lost / reopen behind confirmation, lost needs a reason), tasks, log. */
export function DealDetailPage() {
  const { id = '' } = useParams();
  const { t, kgs, day, date, staffName, fieldError, resultError } = useCrm();
  const actions = useCrmActions();
  const now = useNow();
  const canEdit = useCan('crm.deals.edit');
  const canTasks = useCan('crm.tasks.edit');
  const deal = useCollection<Deal>('deals').find((d) => d.id === id);
  const organizations = useCollection<CrmOrganization>('organizations');
  const contacts = useCollection<CrmContact>('contacts');
  const tasks = useCollection<Task>('tasks');
  const events = useCollection<ActivityEvent>('activity');
  const [to, setTo] = useState<DealStage | ''>('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const back = <BackLink to="/deals" label={t('backToDeals')} />;
  if (!deal) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('dealNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const org = organizations.find((o) => o.id === deal.organizationId);
  const contact = contacts.find((c) => c.id === deal.contactId);
  const outcome = dealOutcome(deal.stage);
  const own = tasks.filter((x) => x.dealId === deal.id).sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'));
  const details: [string, ReactNode][] = [
    [t('fieldOrganization'), org ? <Link key="o" className="bo-link" to={`/organizations/${org.id}`}>{org.name}</Link> : '—'],
    [t('fieldContact'), contact ? <Link key="c" className="bo-link" to={`/contacts/${contact.id}`}>{contact.name}</Link> : '—'],
    [t('fieldOwner'), staffName(deal.ownerId)],
    [t('fieldStage'), <DealStageBadge key="s" stage={deal.stage} />],
    [t('fieldEstimate'), deal.estimatedValueKgs === undefined ? t('noEstimate') : kgs(deal.estimatedValueKgs)],
    [t('fieldExpectedClose'), deal.expectedCloseAt ? day(deal.expectedCloseAt) : '—'],
    [t('fieldDescription'), deal.description ?? '—'],
    [t('fieldCreated'), date(deal.createdAt)],
    [t('fieldStageChanged'), date(deal.stageChangedAt)],
    ...(deal.closedAt ? ([[t('fieldClosed'), date(deal.closedAt)]] as [string, ReactNode][]) : []),
    ...(deal.lostReason ? ([[t('fieldLostReason'), <p key="r" className="bo-quote" style={{ margin: 0 }}>{deal.lostReason}</p>]] as [string, ReactNode][]) : []),
  ];
  const open = (p: Pending) => {
    setPending(p);
    setReason('');
    setReasonError(undefined);
    setError(undefined);
    setSaved(false);
  };
  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    const out = await actions.moveDeal(deal.id, pending.to, reason);
    setBusy(false);
    if (out.ok) {
      setPending(null);
      setTo('');
      setSaved(true);
      return;
    }
    if (out.error === 'invalid') return setReasonError(fieldError(out.fields.reason));
    setError(resultError(out));
  };
  const stageName = (s: DealStage) => t(DEAL_STAGE_KEYS[s]);
  const title = pending
    ? pending.kind === 'won'
      ? fill(t('confirmWon'), { title: deal.title })
      : pending.kind === 'lost'
        ? fill(t('confirmLost'), { title: deal.title })
        : pending.kind === 'reopen'
          ? fill(t('confirmReopen'), { title: deal.title, stage: stageName(pending.to) })
          : fill(t('confirmMove'), { title: deal.title, stage: stageName(pending.to) })
    : '';

  return (
    <>
      {back}
      <PageHeader
        title={deal.title}
        subtitle={`${org?.name ?? '—'} · ${staffName(deal.ownerId)}`}
        actions={
          <span className="crm-head-actions">
            <DealStageBadge stage={deal.stage} />
            <DemoBadge />
            {canEdit && (
              <Link className="bo-btn small ghost" to={`/deals/${deal.id}/edit`}>
                {t('edit')}
              </Link>
            )}
          </span>
        }
      />
      <div className="bo-detail-grid">
        <section className="bo-card" aria-label={t('detailsTitle')}>
          <h2>{t('detailsTitle')}</h2>
          <DetailList items={details} />
        </section>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <section className="bo-card" aria-label={t('stageTitle')}>
            <h2>{t('stageTitle')}</h2>
            <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
              {t('stageHint')}
            </p>
            {canEdit ? (
              <>
                <div className="crm-form-grid" style={{ alignItems: 'end' }}>
                  <SelectField label={t('moveTo')} value={to} onChange={(v) => setTo(v as DealStage | '')} options={[{ value: '', label: '—' }, ...OPEN_STAGES.filter((s) => s !== deal.stage).map((s) => ({ value: s, label: stageName(s) }))]} />
                  <div className="bo-field">
                    <button type="button" className="bo-btn ghost" disabled={!to} onClick={() => to && open({ to, kind: outcome === 'open' ? 'move' : 'reopen' })}>
                      {outcome === 'open' ? t('moveAction') : t('reopenAction')}
                    </button>
                  </div>
                </div>
                {outcome === 'open' && (
                  <div className="bo-actions">
                    <button type="button" className="bo-btn small" onClick={() => open({ to: 'won', kind: 'won' })}>
                      {t('markWon')}
                    </button>
                    <button type="button" className="bo-btn small danger" onClick={() => open({ to: 'lost', kind: 'lost' })}>
                      {t('markLost')}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <ViewOnly />
            )}
            {saved && <output className="bo-saved">{t('savedNotice')}</output>}
            <PermissionNote />
          </section>
          <section className="bo-card" aria-label={t('dealTasks')}>
            <div className="bo-card-head">
              <h2>{t('dealTasks')}</h2>
              {canTasks && (
                <Link className="bo-btn small ghost" to={`/tasks/new?dealId=${deal.id}`}>
                  {t('newTask')}
                </Link>
              )}
            </div>
            {own.length === 0 ? (
              <p className="bo-muted">{t('noTasks')}</p>
            ) : (
              <ul className="bo-list">
                {own.map((x) => (
                  <li key={x.id}>
                    <span className="grow">
                      <Link className="bo-link bo-ellipsis" to={`/tasks/${x.id}`}>
                        {x.title}
                      </Link>
                      <span className={isOverdueTask(x, now) ? 'crm-follow overdue' : 'bo-muted'} style={{ fontSize: 12 }}>
                        {staffName(x.assigneeId)} · {x.dueAt ? date(x.dueAt) : t('dueNone')}
                        {isOverdueTask(x, now) ? ` · ${t('overdue')}` : ''}
                      </span>
                    </span>
                    <TaskStatusBadge status={x.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <section className="bo-section" aria-label={t('changeHistory')}>
        <h2>{t('changeHistory')}</h2>
        <AuditTable events={events.filter((e) => e.entity.type === 'deal' && e.entity.id === deal.id)} />
      </section>
      <ConfirmDialog
        open={pending !== null}
        title={title}
        body={pending?.kind === 'won' ? t('confirmWonBody') : pending?.kind === 'lost' ? t('confirmLostBody') : t('confirmMoveBody')}
        confirmLabel={pending?.kind === 'won' ? t('markWon') : pending?.kind === 'lost' ? t('markLost') : pending?.kind === 'reopen' ? t('reopenAction') : t('moveAction')}
        danger={pending?.kind === 'lost'}
        reason={pending ? { required: pending.kind === 'lost', value: reason, onChange: (v) => (setReason(v), setReasonError(undefined)), error: reasonError } : undefined}
        busy={busy}
        error={error}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
