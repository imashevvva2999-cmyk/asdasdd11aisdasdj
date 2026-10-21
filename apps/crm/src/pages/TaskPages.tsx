import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useActor, useBackoffice, useCan, useCollection } from '@mmusic/backoffice/react';
import { BackLink, ConfirmDialog, DemoBadge, DetailList, EmptyState, PageHeader, PermissionNote } from '@mmusic/backoffice/ui';

import { useCrmActions } from '@/data/actions';
import type { FieldErrors } from '@/domain/rules';
import { isOverdueTask, taskInput, type TaskField, type TaskInput } from '@/domain/tasks';
import { TASK_PRIORITIES, type CrmContact, type CrmOrganization, type Deal, type Task, type TaskStatus } from '@/domain/types';
import { fill, PRIORITY_KEYS } from '@/strings';
import { AuditTable, PriorityBadge, SelectField, TaskStatusBadge, TextAreaField, TextField, toLocalInput, useCrm, useNow, ViewOnly } from '@/ui';

/** One task: details, status actions (complete / cancel / reopen behind confirmation) and its full history. */
export function TaskDetailPage() {
  const { id = '' } = useParams();
  const { t, date, staffName, resultError } = useCrm();
  const actions = useCrmActions();
  const now = useNow();
  const canEdit = useCan('crm.tasks.edit');
  const task = useCollection<Task>('tasks').find((x) => x.id === id);
  const deals = useCollection<Deal>('deals');
  const organizations = useCollection<CrmOrganization>('organizations');
  const contacts = useCollection<CrmContact>('contacts');
  const events = useCollection<ActivityEvent>('activity');
  const [pending, setPending] = useState<TaskStatus | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const back = <BackLink to="/tasks" label={t('backToTasks')} />;
  if (!task) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('taskNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const deal = deals.find((d) => d.id === task.dealId);
  const org = organizations.find((o) => o.id === task.organizationId);
  const contact = contacts.find((c) => c.id === task.contactId);
  const overdue = isOverdueTask(task, now);
  const details: [string, ReactNode][] = [
    [t('fieldStatus'), <TaskStatusBadge key="s" status={task.status} />],
    [t('fieldPriority'), <PriorityBadge key="p" priority={task.priority} />],
    [t('fieldAssignee'), staffName(task.assigneeId)],
    [t('fieldDue'), <span key="d" className={overdue ? 'crm-follow overdue' : undefined}>{task.dueAt ? `${date(task.dueAt)}${overdue ? ` · ${t('overdue')}` : ''}` : t('dueNone')}</span>],
    [t('fieldDeal'), deal ? <Link key="dl" className="bo-link" to={`/deals/${deal.id}`}>{deal.title}</Link> : '—'],
    [t('fieldOrganization'), org ? <Link key="o" className="bo-link" to={`/organizations/${org.id}`}>{org.name}</Link> : '—'],
    [t('fieldContact'), contact ? <Link key="c" className="bo-link" to={`/contacts/${contact.id}`}>{contact.name}</Link> : '—'],
    [t('fieldDescription'), task.description ?? '—'],
    [t('fieldCreated'), date(task.createdAt)],
    ...(task.completedAt ? ([[t('statusCompleted'), fill(t('completedBy'), { name: staffName(task.completedBy ?? ''), date: date(task.completedAt) })]] as [string, ReactNode][]) : []),
    ...(task.cancelReason ? ([[t('fieldCancelReason'), task.cancelReason]] as [string, ReactNode][]) : []),
  ];
  const change = async (to: TaskStatus, note?: string) => {
    setBusy(true);
    const out = await actions.changeTaskStatus(task.id, to, note);
    setBusy(false);
    if (!out.ok) return setError(resultError(out));
    setPending(null);
    setSaved(true);
  };
  const ask = (to: TaskStatus) => {
    setPending(to);
    setReason('');
    setError(undefined);
    setSaved(false);
  };
  const open = task.status === 'pending' || task.status === 'in-progress';

  return (
    <>
      {back}
      <PageHeader
        title={task.title}
        subtitle={`${staffName(task.assigneeId)} · ${task.dueAt ? date(task.dueAt) : t('dueNone')}`}
        actions={
          <span className="crm-head-actions">
            <TaskStatusBadge status={task.status} />
            <DemoBadge />
            {canEdit && (
              <Link className="bo-btn small ghost" to={`/tasks/${task.id}/edit`}>
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
        <section className="bo-card" aria-label={t('taskStatusTitle')}>
          <h2>{t('taskStatusTitle')}</h2>
          {canEdit ? (
            <div className="bo-actions">
              {task.status === 'pending' && (
                <button type="button" className="bo-btn small ghost" disabled={busy} onClick={() => void change('in-progress')}>
                  {t('startAction')}
                </button>
              )}
              {open && (
                <button type="button" className="bo-btn small" onClick={() => ask('completed')}>
                  {t('complete')}
                </button>
              )}
              {task.status === 'in-progress' && (
                <button type="button" className="bo-btn small ghost" disabled={busy} onClick={() => void change('pending')}>
                  {t('pauseAction')}
                </button>
              )}
              {open && (
                <button type="button" className="bo-btn small danger" onClick={() => ask('cancelled')}>
                  {t('cancelAction')}
                </button>
              )}
              {!open && (
                <button type="button" className="bo-btn small ghost" onClick={() => ask('pending')}>
                  {t('reopenTask')}
                </button>
              )}
            </div>
          ) : (
            <ViewOnly />
          )}
          {saved && <output className="bo-saved">{t('savedNotice')}</output>}
          {error && !pending && (
            <p className="bo-field-error" role="alert">
              {error}
            </p>
          )}
          <PermissionNote icon="notifications-none" text={t('localRemindersNote')} />
        </section>
      </div>
      <section className="bo-section" aria-label={t('changeHistory')}>
        <h2>{t('changeHistory')}</h2>
        <AuditTable events={events.filter((e) => e.entity.type === 'task' && e.entity.id === task.id)} />
      </section>
      <ConfirmDialog
        open={pending !== null}
        title={fill(t(pending === 'completed' ? 'confirmComplete' : pending === 'cancelled' ? 'confirmCancel' : 'confirmReopenTask'), { title: task.title })}
        body={pending === 'completed' ? t('confirmCompleteBody') : pending === 'cancelled' ? t('confirmCancelBody') : t('confirmReopenTaskBody')}
        confirmLabel={pending === 'completed' ? t('complete') : pending === 'cancelled' ? t('cancelAction') : t('reopenTask')}
        danger={pending === 'cancelled'}
        reason={pending === 'cancelled' ? { required: false, value: reason, onChange: setReason } : undefined}
        busy={busy}
        error={error}
        onConfirm={() => pending && void change(pending, reason)}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

/** Create (/tasks/new, optional ?dealId= / ?contactId= / ?organizationId=) or edit (/tasks/:id/edit); crm.tasks.edit. */
export function TaskFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t, fieldError, resultError } = useCrm();
  const navigate = useNavigate();
  const actions = useCrmActions();
  const bo = useBackoffice();
  const { staff: actor } = useActor();
  const existing = useCollection<Task>('tasks').find((x) => x.id === id);
  const deals = useCollection<Deal>('deals');
  const organizations = useCollection<CrmOrganization>('organizations');
  const contacts = useCollection<CrmContact>('contacts');
  const staff = bo.staff.filter((s) => s.app === 'crm');
  const [input, setInput] = useState<TaskInput>(() => {
    if (existing) return { ...taskInput(existing), dueAt: existing.dueAt ? toLocalInput(existing.dueAt) : '' };
    const dealId = params.get('dealId') ?? '';
    const deal = deals.find((d) => d.id === dealId);
    return taskInput(undefined, { assigneeId: actor?.app === 'crm' ? actor.id : '', dealId, organizationId: params.get('organizationId') ?? deal?.organizationId ?? '', contactId: params.get('contactId') ?? deal?.contactId ?? '' });
  });
  const [fields, setFields] = useState<FieldErrors<TaskField>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const back = id ? <BackLink to={`/tasks/${id}`} label={existing?.title ?? t('backToTasks')} /> : <BackLink to="/tasks" label={t('backToTasks')} />;
  if (id && !existing) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('taskNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const set = (key: TaskField) => (value: string) => {
    setInput((s) => ({ ...s, [key]: value }));
    setFields((f) => ({ ...f, [key]: undefined }));
  };
  const submit = async () => {
    setBusy(true);
    const out = id ? await actions.updateTask(id, input) : await actions.createTask(input);
    setBusy(false);
    if (out.ok) return navigate(`/tasks/${out.id}`);
    setError(resultError(out));
    if (out.error === 'invalid') setFields(out.fields);
  };
  const byName = <T extends { name: string }>(xs: T[]) => [...xs].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {back}
      <PageHeader title={id ? t('editTask') : t('newTask')} subtitle={existing?.title} actions={<DemoBadge />} />
      <form
        className="bo-card crm-form"
        aria-label={id ? t('editTask') : t('newTask')}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void submit();
        }}
      >
        <TextField label={t('fieldTitle')} required value={input.title} onChange={set('title')} error={fieldError(fields.title)} />
        <div className="crm-form-grid">
          <SelectField label={t('fieldAssignee')} required value={input.assigneeId} onChange={set('assigneeId')} error={fieldError(fields.assigneeId)} options={[{ value: '', label: '—' }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} />
          <SelectField label={t('fieldPriority')} value={input.priority} onChange={set('priority')} options={TASK_PRIORITIES.map((p) => ({ value: p, label: t(PRIORITY_KEYS[p]) }))} />
          <TextField label={t('fieldDue')} type="datetime-local" value={input.dueAt} onChange={set('dueAt')} error={fieldError(fields.dueAt)} />
          <SelectField label={t('fieldDeal')} value={input.dealId} onChange={set('dealId')} error={fieldError(fields.dealId)} options={[{ value: '', label: t('none') }, ...[...deals].sort((a, b) => a.title.localeCompare(b.title)).map((d) => ({ value: d.id, label: d.title }))]} />
          <SelectField label={t('fieldOrganization')} value={input.organizationId} onChange={set('organizationId')} error={fieldError(fields.organizationId)} hint={t('taskLinksHint')} options={[{ value: '', label: t('none') }, ...byName(organizations).map((o) => ({ value: o.id, label: o.name }))]} />
          <SelectField label={t('fieldContact')} value={input.contactId} onChange={set('contactId')} error={fieldError(fields.contactId)} options={[{ value: '', label: t('none') }, ...byName(contacts).map((c) => ({ value: c.id, label: c.name }))]} />
        </div>
        <TextAreaField label={t('fieldDescription')} value={input.description} onChange={set('description')} error={fieldError(fields.description)} />
        {error && (
          <p className="bo-field-error" role="alert">
            {error}
          </p>
        )}
        <div className="crm-form-actions">
          <button type="submit" className="bo-btn" disabled={busy} aria-busy={busy}>
            {t('save')}
          </button>
          <button type="button" className="bo-btn ghost" disabled={busy} onClick={() => navigate(id ? `/tasks/${id}` : '/tasks')}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </>
  );
}
