import { auditEvent, type DecisionContext } from '@mmusic/backoffice/review';

import { allowed, clean, validDate, type Audit, type Failure, type FieldErrors } from './rules.ts';
import type { CrmContact, CrmOrganization, Deal, Interaction, Task, TaskPriority, TaskStatus } from './types.ts';

/**
 * CRM task rules (M5): validation, the (prototype) permission check crm.tasks.edit, status transitions with their
 * audit events (the completion history), overdue state and the agenda that merges tasks with the M4 interaction
 * reminders — read from the interactions themselves, never copied, so nothing is lost or duplicated.
 */

export type TaskInput = { title: string; description: string; priority: TaskPriority; assigneeId: string; dueAt: string; contactId: string; organizationId: string; dealId: string };
export type TaskField = keyof TaskInput;
export type TaskLinks = { contacts: CrmContact[]; organizations: CrmOrganization[]; deals: Deal[]; staffIds: string[] };
type TaskValue = Pick<Task, 'title' | 'description' | 'priority' | 'assigneeId' | 'dueAt' | 'contactId' | 'organizationId' | 'dealId'>;

export const isOpenTask = (t: Pick<Task, 'status'>) => t.status === 'pending' || t.status === 'in-progress';
export const isOverdueTask = (t: Pick<Task, 'status' | 'dueAt'>, now: string) => isOpenTask(t) && !!t.dueAt && t.dueAt < now;

export function taskInput(t?: Task, preset: Partial<TaskInput> = {}): TaskInput {
  return {
    title: t?.title ?? '',
    description: t?.description ?? '',
    priority: t?.priority ?? 'normal',
    assigneeId: t?.assigneeId ?? '',
    dueAt: t?.dueAt ?? '',
    contactId: t?.contactId ?? '',
    organizationId: t?.organizationId ?? '',
    dealId: t?.dealId ?? '',
    ...preset,
  };
}

/** The organization follows the deal, then the contact, when not chosen; all links must agree. */
export function validateTask(input: TaskInput, links: TaskLinks): { ok: true; value: TaskValue } | { ok: false; fields: FieldErrors<TaskField> } {
  const fields: FieldErrors<TaskField> = {};
  const title = clean(input.title);
  const deal = links.deals.find((d) => d.id === input.dealId);
  const contact = links.contacts.find((c) => c.id === input.contactId);
  if (!title) fields.title = 'required';
  else if (title.length > 120) fields.title = 'too-long';
  if (clean(input.description).length > 500) fields.description = 'too-long';
  if (!input.assigneeId) fields.assigneeId = 'required';
  else if (!links.staffIds.includes(input.assigneeId)) fields.assigneeId = 'unknown-staff';
  if (input.dueAt && !validDate(input.dueAt)) fields.dueAt = 'date-invalid';
  if (input.dealId && !deal) fields.dealId = 'unknown-deal';
  if (input.contactId && !contact) fields.contactId = 'unknown-contact';
  if (input.organizationId && !links.organizations.some((o) => o.id === input.organizationId)) fields.organizationId = 'unknown-organization';
  const organizationId = input.organizationId || deal?.organizationId || contact?.organizationId || '';
  if (deal && organizationId && deal.organizationId !== organizationId) fields.dealId = 'deal-not-in-org';
  if (contact && organizationId && contact.organizationId && contact.organizationId !== organizationId) fields.contactId = 'contact-not-in-org';
  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return {
    ok: true,
    value: {
      title,
      description: clean(input.description) || undefined,
      priority: input.priority,
      assigneeId: input.assigneeId,
      dueAt: input.dueAt ? new Date(input.dueAt).toISOString() : undefined,
      contactId: input.contactId || undefined,
      organizationId: organizationId || undefined,
      dealId: input.dealId || undefined,
    },
  };
}

const compact = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export function createTask(input: TaskInput, links: TaskLinks, ctx: DecisionContext): { ok: true; record: Omit<Task, 'id' | 'mock'>; audit: (id: string) => Audit } | Failure<TaskField> {
  if (!allowed(ctx, 'crm.tasks.edit')) return { ok: false, error: 'forbidden' };
  const v = validateTask(input, links);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  return { ok: true, record: compact({ ...v.value, status: 'pending' as const, createdAt: ctx.now }), audit: (id) => auditEvent({ action: 'task.create', entity: { type: 'task', id, label: v.value.title }, toStatus: 'pending' }, ctx) };
}

export function updateTask(task: Task, input: TaskInput, links: TaskLinks, ctx: DecisionContext): { ok: true; patch: Partial<Task>; event: Audit } | Failure<TaskField> {
  if (!allowed(ctx, 'crm.tasks.edit')) return { ok: false, error: 'forbidden' };
  const v = validateTask(input, links);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  return { ok: true, patch: { ...v.value, updatedAt: ctx.now }, event: auditEvent({ action: v.value.assigneeId !== task.assigneeId ? 'task.assign' : 'task.update', entity: { type: 'task', id: task.id, label: v.value.title } }, ctx) };
}

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in-progress', 'completed', 'cancelled'],
  'in-progress': ['completed', 'cancelled', 'pending'],
  completed: ['pending'],
  cancelled: ['pending'],
};

const ACTIONS: Record<TaskStatus, string> = { 'in-progress': 'task.start', completed: 'task.complete', cancelled: 'task.cancel', pending: 'task.reopen' };

/** Status change; completing records who and when (earlier completions stay in the change log after a reopen). */
export function changeTaskStatus(task: Task, to: TaskStatus, reason: string | undefined, ctx: DecisionContext): { ok: true; patch: Partial<Task>; event: Audit } | Failure<never> {
  if (!allowed(ctx, 'crm.tasks.edit')) return { ok: false, error: 'forbidden' };
  if (task.status === to) return { ok: false, error: 'same-status' };
  if (!TRANSITIONS[task.status].includes(to)) return { ok: false, error: 'invalid-transition' };
  const note = clean(reason) || undefined;
  const patch: Partial<Task> = { status: to, updatedAt: ctx.now };
  if (to === 'completed') Object.assign(patch, { completedAt: ctx.now, completedBy: ctx.actor.staffId, cancelReason: undefined });
  if (to === 'cancelled') Object.assign(patch, { cancelReason: note, completedAt: undefined, completedBy: undefined });
  if (to === 'pending' || to === 'in-progress') Object.assign(patch, { completedAt: undefined, completedBy: undefined, cancelReason: undefined });
  const action = to === 'pending' && task.status === 'in-progress' ? 'task.pause' : ACTIONS[to];
  return { ok: true, patch, event: auditEvent({ action, entity: { type: 'task', id: task.id, label: task.title }, fromStatus: task.status, toStatus: to, reason: note }, ctx) };
}

/** One dated item of the agenda: an open task or an open interaction reminder (M4). */
export type AgendaItem = { kind: 'task'; id: string; due: string; overdue: boolean; task: Task } | { kind: 'reminder'; id: string; due: string; overdue: boolean; interaction: Interaction };

/** Open tasks with a due date and open interaction reminders, soonest first. */
export function agenda(tasks: Task[], interactions: Interaction[], now: string): AgendaItem[] {
  const items: AgendaItem[] = [
    ...tasks.filter((t) => isOpenTask(t) && t.dueAt).map((task) => ({ kind: 'task' as const, id: task.id, due: task.dueAt!, overdue: task.dueAt! < now, task })),
    ...interactions.filter((i) => i.followUpAt && !i.followUpDone).map((interaction) => ({ kind: 'reminder' as const, id: interaction.id, due: interaction.followUpAt!, overdue: interaction.followUpAt! < now, interaction })),
  ];
  return items.sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
}

export const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };
