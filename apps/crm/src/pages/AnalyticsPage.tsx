import type { ReactNode } from 'react';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useBackoffice, useCollection } from '@mmusic/backoffice/react';
import { DemoBadge, FilterBar, FilterSelect, PageHeader, PermissionNote } from '@mmusic/backoffice/ui';

import { usePipeline } from '@/access';
import { dealTotals, interactionsByKind, periodStart, PERIODS, pipelineByStage, relationshipDistribution, reminderTotals, staffActivity, taskTotals, type Period } from '@/domain/analytics';
import { INTERACTION_KINDS, RELATIONSHIP_STATUSES, TASK_STATUSES, type CrmOrganization, type Deal, type Interaction, type Task } from '@/domain/types';
import { INTERACTION_KIND_KEYS, RELATIONSHIP_LABELS, TASK_STATUS_KEYS, type CrmStringKey } from '@/strings';
import { useCrm, useNow, useQueryState } from '@/ui';

/** A fixed, labelled indicator table; the first cell of each row is its unique label. */
function Table({ id, title, head, rows, numeric = [] }: { id: string; title: string; head: string[]; rows: [string, ...ReactNode[]][]; numeric?: number[] }) {
  return (
    <section className="bo-card" aria-labelledby={`a-${id}`} data-analytics={id} style={{ minWidth: 0 }}>
      <h2 id={`a-${id}`} style={{ margin: '0 0 12px', font: '700 18px/24px "Plus Jakarta Sans", system-ui, sans-serif' }}>
        {title}
      </h2>
      <div className="bo-table-wrap">
        <table className="bo-table">
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={h} style={numeric.includes(i) ? { textAlign: 'right' } : undefined}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td key={head[i]} className={i === 0 ? undefined : 'muted'} style={numeric.includes(i) ? { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } : undefined}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const PERIOD_KEYS: Record<Period, CrmStringKey> = { all: 'periodAll', '30d': 'period30', '7d': 'period7' };

/**
 * CRM analytics (M5): figures computed from the demo records (deals, tasks, reminders, interactions, organizations,
 * change log). Estimates are fictional; the period filter applies only to dated activity.
 */
export function AnalyticsPage() {
  const { t, l, kgs, staffName } = useCrm();
  const bo = useBackoffice();
  const now = useNow();
  const query = useQueryState();
  const pipeline = usePipeline();
  const period = (PERIODS as readonly string[]).includes(query.get('period')) ? (query.get('period') as Period) : 'all';
  const since = periodStart(period, now);
  const deals = useCollection<Deal>('deals');
  const tasks = useCollection<Task>('tasks');
  const interactions = useCollection<Interaction>('interactions');
  const organizations = useCollection<CrmOrganization>('organizations');
  const activity = useCollection<ActivityEvent>('activity');
  const totals = dealTotals(deals);
  const taskSum = taskTotals(tasks, now, since);
  const reminders = reminderTotals(interactions, now);
  const byKind = interactionsByKind(interactions, now, since);
  const rel = relationshipDistribution(organizations);
  const staff = staffActivity(bo.staff, { deals, tasks, interactions, activity }, now, since);

  return (
    <>
      <PageHeader title={t('analyticsTitle')} subtitle={t('analyticsSubtitle')} actions={<DemoBadge />} />
      <FilterBar>
        <FilterSelect label={t('period')} value={period} onChange={(v) => query.set('period', v === 'all' ? '' : v)} options={PERIODS.map((p) => ({ value: p, label: t(PERIOD_KEYS[p]) }))} />
      </FilterBar>
      <div style={{ marginBottom: 16 }}>
        <PermissionNote icon="info-outline" text={t('periodHint')} />
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="crm-columns">
          <Table id="pipeline" title={t('aPipeline')} head={[t('colStage'), t('colCount'), t('colEstimateSum')]} numeric={[1, 2]} rows={pipelineByStage(deals, pipeline.boardIds).map((r) => [pipeline.label(r.stage), r.count, r.estimateKgs ? kgs(r.estimateKgs) : '—'])} />
          <Table
            id="outcomes"
            title={t('aOutcomes')}
            head={[t('colIndicator'), t('colValue')]}
            numeric={[1]}
            rows={[
              [t('openDeals'), totals.open],
              [t('wonDeals'), totals.won],
              [t('lostDeals'), totals.lost],
              [t('openEstimate'), kgs(totals.openEstimateKgs)],
              [t('wonEstimate'), kgs(totals.wonEstimateKgs)],
              [t('withoutEstimate'), totals.withoutEstimate],
            ]}
          />
        </div>
        <div className="crm-columns">
          <Table
            id="tasks"
            title={t('aTasks')}
            head={[t('colIndicator'), t('colValue')]}
            numeric={[1]}
            rows={[...TASK_STATUSES.map((s): [string, number] => [t(TASK_STATUS_KEYS[s]), taskSum.byStatus[s]]), [t('tasksOverdue'), taskSum.overdue], [t('tasksCompletedPeriod'), taskSum.completedInPeriod]]}
          />
          <Table
            id="reminders"
            title={t('aReminders')}
            head={[t('colIndicator'), t('colValue')]}
            numeric={[1]}
            rows={[
              [t('remindersOpen'), reminders.open],
              [t('remindersOverdue'), reminders.overdue],
              [t('remindersDone'), reminders.done],
            ]}
          />
        </div>
        <div className="crm-columns">
          <Table id="interactions" title={t('aInteractions')} head={[t('colKind'), t('colCount')]} numeric={[1]} rows={INTERACTION_KINDS.map((k): [string, number] => [t(INTERACTION_KIND_KEYS[k]), byKind[k]])} />
          <Table id="relationships" title={t('aRelationships')} head={[t('colRelationship'), t('colCount')]} numeric={[1]} rows={RELATIONSHIP_STATUSES.map((s): [string, number] => [l(RELATIONSHIP_LABELS[s]), rel[s]])} />
        </div>
        <Table
          id="staff"
          title={t('aStaff')}
          head={[t('colStaff'), t('colOpenDeals'), t('colOpenTasks'), t('colOverdueTasks'), t('colCompletedTasks'), t('colInteractions'), t('colChanges')]}
          numeric={[1, 2, 3, 4, 5, 6]}
          rows={staff.map((s): [string, ...number[]] => [staffName(s.staffId), s.openDeals, s.openTasks, s.overdueTasks, s.completedTasks, s.interactions, s.changes])}
        />
      </div>
    </>
  );
}
