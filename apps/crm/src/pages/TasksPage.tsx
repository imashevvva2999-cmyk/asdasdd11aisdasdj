import { Link } from 'react-router';

import { useBackoffice, useCollection } from '@mmusic/backoffice/react';
import { DemoBadge, EmptyState, FilterBar, FilterSelect, PageHeader, PermissionNote, SearchField, StatusBadge } from '@mmusic/backoffice/ui';

import { useCrmCan } from '@/access';
import { useCrmActions } from '@/data/actions';
import { PRIORITY_ORDER } from '@/domain/tasks';
import { TASK_PRIORITIES, TASK_STATUSES, type CrmArtist, type CrmContact, type CrmOrganization, type Deal, type Interaction, type Task, type TaskPriority, type TaskStatus } from '@/domain/types';
import { fill, PRIORITY_KEYS, TASK_STATUS_KEYS } from '@/strings';
import { matches, PriorityBadge, TaskStatusBadge, useCrm, useNow, useQueryState, ViewOnly } from '@/ui';

/** A row of the list: a CRM task, or an M4 interaction reminder shown in place (read from the interaction, not copied). */
type Row = {
  key: string;
  source: 'task' | 'reminder';
  id: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  assigneeId: string;
  dueAt?: string;
  contactId?: string;
  organizationId?: string;
  artistId?: string;
  dealId?: string;
};

const DAY = 86_400_000;

/** Tasks and reminders: search, status / priority / due / assignee / source filters kept in the URL. */
export function TasksPage() {
  const { t, date, staffName } = useCrm();
  const bo = useBackoffice();
  const actions = useCrmActions();
  const now = useNow();
  const canTasks = useCrmCan('crm.tasks.edit');
  const canReminders = useCrmCan('crm.activity.edit');
  const tasks = useCollection<Task>('tasks');
  const interactions = useCollection<Interaction>('interactions');
  const contacts = useCollection<CrmContact>('contacts');
  const organizations = useCollection<CrmOrganization>('organizations');
  const artists = useCollection<CrmArtist>('artists');
  const deals = useCollection<Deal>('deals');
  const query = useQueryState();
  const [q, status, priority, due, assignee, source] = ['q', 'status', 'priority', 'due', 'assignee', 'source'].map(query.get);
  const contactName = (id?: string) => contacts.find((c) => c.id === id)?.name;
  const orgName = (id?: string) => organizations.find((o) => o.id === id)?.name;
  const dealTitle = (id?: string) => deals.find((d) => d.id === id)?.title;
  const artistName = (id?: string) => artists.find((a) => a.id === id)?.stageName;

  const all: Row[] = [
    ...tasks.map((x): Row => ({ key: `t-${x.id}`, source: 'task', id: x.id, title: x.title, status: x.status, priority: x.priority, assigneeId: x.assigneeId, dueAt: x.dueAt, contactId: x.contactId, organizationId: x.organizationId, artistId: x.artistId, dealId: x.dealId })),
    ...interactions
      .filter((i) => i.followUpAt)
      .map((i): Row => ({ key: `r-${i.id}`, source: 'reminder', id: i.id, title: i.summary, status: i.followUpDone ? 'completed' : 'pending', assigneeId: i.authorId, dueAt: i.followUpAt, contactId: i.contactId, organizationId: i.organizationId, artistId: i.artistId })),
  ];
  const open = (r: Row) => r.status === 'pending' || r.status === 'in-progress';
  const overdue = (r: Row) => open(r) && !!r.dueAt && r.dueAt < now;
  const dueMatch = (r: Row) => {
    if (!due) return true;
    if (due === 'none') return !r.dueAt;
    if (!r.dueAt || !open(r)) return false;
    if (due === 'overdue') return r.dueAt < now;
    const end = new Date(Date.parse(now) + (due === 'today' ? 0 : 7) * DAY);
    if (due === 'today') end.setHours(23, 59, 59, 999);
    return r.dueAt >= now && r.dueAt <= end.toISOString();
  };
  const rows = all
    .filter(
      (r) =>
        (!source || r.source === source) &&
        (!status || r.status === status) &&
        (!priority || r.priority === priority) &&
        (!assignee || r.assigneeId === assignee) &&
        dueMatch(r) &&
        (!q || matches(`${r.title} ${contactName(r.contactId) ?? ''} ${orgName(r.organizationId) ?? ''} ${artistName(r.artistId) ?? ''} ${dealTitle(r.dealId) ?? ''}`, q)),
    )
    .sort((a, b) => Number(open(b)) - Number(open(a)) || Number(overdue(b)) - Number(overdue(a)) || (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999') || PRIORITY_ORDER[a.priority ?? 'normal'] - PRIORITY_ORDER[b.priority ?? 'normal']);
  const overdueCount = all.filter(overdue).length;
  const staff = bo.staff.filter((s) => s.app === 'crm');
  const complete = (r: Row) => (r.source === 'task' ? actions.changeTaskStatus(r.id, 'completed') : actions.completeFollowUp(r.id));

  return (
    <>
      <PageHeader
        title={t('tasksTitle')}
        subtitle={t('tasksSubtitle')}
        actions={
          <span className="crm-head-actions">
            <DemoBadge />
            {canTasks && (
              <Link className="bo-btn small" to="/tasks/new">
                {t('newTask')}
              </Link>
            )}
          </span>
        }
      />
      {!canTasks && <ViewOnly />}
      <div style={{ marginBottom: 12 }}>
        <PermissionNote icon="notifications-none" text={t('localRemindersNote')} />
      </div>
      <FilterBar summary={`${fill(t('shown'), { n: rows.length, total: all.length })}${overdueCount ? ` · ${fill(t('overdueCount'), { n: overdueCount })}` : ''}`}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchTasks')} />
        <FilterSelect label={t('filterStatus')} value={status} onChange={(v) => query.set('status', v)} options={[{ value: '', label: '—' }, ...TASK_STATUSES.map((s) => ({ value: s, label: t(TASK_STATUS_KEYS[s]) }))]} />
        <FilterSelect label={t('filterPriority')} value={priority} onChange={(v) => query.set('priority', v)} options={[{ value: '', label: '—' }, ...TASK_PRIORITIES.map((p) => ({ value: p, label: t(PRIORITY_KEYS[p]) }))]} />
        <FilterSelect label={t('filterDue')} value={due} onChange={(v) => query.set('due', v)} options={[{ value: '', label: '—' }, { value: 'overdue', label: t('dueOverdue') }, { value: 'today', label: t('dueToday') }, { value: 'week', label: t('dueWeek') }, { value: 'none', label: t('dueNone') }]} />
        <FilterSelect label={t('filterAssignee')} value={assignee} onChange={(v) => query.set('assignee', v)} options={[{ value: '', label: '—' }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} />
        <FilterSelect label={t('filterSource')} value={source} onChange={(v) => query.set('source', v)} options={[{ value: '', label: '—' }, { value: 'task', label: t('sourceTasks') }, { value: 'reminder', label: t('sourceReminders') }]} />
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState icon="search-off" title={all.length === 0 ? t('noTasks') : t('emptyFiltered')} body={t('emptyFilteredHint')}>
          <button type="button" className="bo-btn ghost" onClick={query.clear}>
            {t('clearFilters')}
          </button>
        </EmptyState>
      ) : (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th>{t('colTask')}</th>
                <th>{t('colRelated')}</th>
                <th>{t('colAssignee')}</th>
                <th>{t('colDue')}</th>
                <th>{t('colPriority')}</th>
                <th>{t('colStatus')}</th>
                <th>
                  <span className="bo-sr">{t('complete')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const canComplete = open(r) && (r.source === 'task' ? canTasks : canReminders);
                const link = r.source === 'task' ? `/tasks/${r.id}` : r.contactId ? `/contacts/${r.contactId}` : r.artistId ? `/artists/${r.artistId}` : `/organizations/${r.organizationId}`;
                return (
                  <tr key={r.key} data-row={r.key}>
                    <td style={{ minWidth: 220 }}>
                      <Link className="bo-link" to={link}>
                        {r.title}
                      </Link>
                      {r.source === 'reminder' && (
                        <span style={{ marginLeft: 8 }}>
                          <StatusBadge tone="neutral" label={t('reminderBadge')} />
                        </span>
                      )}
                    </td>
                    <td className="muted">{[dealTitle(r.dealId), artistName(r.artistId), orgName(r.organizationId), contactName(r.contactId)].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="muted">{staffName(r.assigneeId)}</td>
                    <td className="nowrap">
                      <span className={overdue(r) ? 'crm-follow overdue' : 'bo-muted'}>{r.dueAt ? date(r.dueAt) : t('dueNone')}</span>
                      {overdue(r) && <span className="crm-follow overdue bo-sub">{t('overdue')}</span>}
                    </td>
                    <td>{r.priority ? <PriorityBadge priority={r.priority} /> : <span className="bo-muted">—</span>}</td>
                    <td>
                      <TaskStatusBadge status={r.status} />
                    </td>
                    <td>
                      {canComplete && (
                        <button type="button" className="bo-btn ghost small" onClick={() => void complete(r)}>
                          {r.source === 'task' ? t('complete') : t('markDone')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
