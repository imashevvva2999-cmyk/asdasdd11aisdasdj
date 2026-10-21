import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMockDataSource } from '@mmusic/backoffice/data';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { createSafeStorage, type StorageBackend } from '@mmusic/backoffice/storage';

import { dealTotals, interactionsByKind, periodStart, pipelineByStage, reminderTotals, staffActivity, taskTotals } from '../src/domain/analytics.ts';
import { CRM_DATA_KEY, CRM_DATA_VERSION, migrateCrmData, migrateStoredCrmData } from '../src/domain/migrate.ts';
import { createDeal, dealInput, moveDeal, nextStage, parseKgs, updateDeal, validateDeal, type DealInput } from '../src/domain/pipeline.ts';
import { crmSummary } from '../src/domain/rules.ts';
import { buildCrmMatrix, defaultRoleConfigs } from '../src/domain/permissions.ts';
import { crmSeed } from '../src/domain/seed.ts';
import { agenda, changeTaskStatus, createTask, isOverdueTask, taskInput, validateTask, type TaskInput } from '../src/domain/tasks.ts';
import type { CrmCollections, Deal, Task } from '../src/domain/types.ts';

const matrix = buildCrmMatrix(defaultRoleConfigs());
const NOW = '2026-10-21T12:00:00.000Z';
const as = (roleId: string) => ({ matrix, actor: { staffId: DEMO_STAFF.find((s) => s.roleId === roleId)?.id ?? 'x', roleId }, now: NOW });
const seed = crmSeed();
const STAFF = DEMO_STAFF.filter((s) => s.app === 'crm').map((s) => s.id);
const links = { contacts: seed.contacts, organizations: seed.organizations, deals: seed.deals, staffIds: STAFF };
const deal = (id: string) => seed.deals.find((d) => d.id === id)!;
const task = (id: string) => seed.tasks.find((x) => x.id === id)!;
const NEW_DEAL: DealInput = { ...dealInput(undefined, 'staff-crm-2'), title: 'Демо: подборка площадки', organizationId: 'org-2', contactId: 'contact-2', estimatedValue: '75 000', expectedCloseAt: '2026-12-01', stage: 'qualified' };
const OPEN = ['lead', 'qualified', 'proposal', 'negotiation'];
const NEW_TASK: TaskInput = { ...taskInput(), title: 'Демо-задача', assigneeId: 'staff-crm-2', dealId: 'deal-2', dueAt: '2026-10-25T10:00' };

function memoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

void test('M5 seed: referential integrity, fictional estimates, consistent states', () => {
  for (const d of seed.deals) {
    assert.ok(d.mock && seed.organizations.some((o) => o.id === d.organizationId), d.id);
    if (d.contactId) assert.equal(seed.contacts.find((c) => c.id === d.contactId)?.organizationId, d.organizationId, `${d.id}: contact belongs to the organization`);
    assert.ok(STAFF.includes(d.ownerId));
    assert.ok(d.estimatedValueKgs === undefined || Number.isInteger(d.estimatedValueKgs));
    assert.equal(!!d.closedAt, d.stage === 'won' || d.stage === 'lost', `${d.id}: closedAt only when closed`);
    assert.equal(!!d.lostReason, d.stage === 'lost');
    assert.ok(!/договор подписан|contract signed|оплачен/i.test(`${d.title} ${d.description ?? ''}`));
  }
  for (const x of seed.tasks) {
    assert.ok(x.mock && STAFF.includes(x.assigneeId), x.id);
    if (x.dealId) assert.equal(deal(x.dealId).organizationId, x.organizationId, `${x.id}: deal organization`);
    if (x.contactId) assert.ok(seed.contacts.some((c) => c.id === x.contactId));
    assert.equal(!!x.completedAt, x.status === 'completed');
  }
  for (const e of seed.activity) assert.ok((e.entity.type === 'deal' ? seed.deals : seed.tasks).some((r) => r.id === e.entity.id), e.id);
});

void test('deal validation: organization required, contact must belong to it, estimate is a whole KGS number', () => {
  assert.equal(parseKgs('120 000'), 120000);
  assert.equal(parseKgs(''), undefined);
  assert.ok(Number.isNaN(parseKgs('12,5')));
  const ok = validateDeal(NEW_DEAL, seed.organizations, seed.contacts, STAFF);
  assert.ok(ok.ok && ok.value.estimatedValueKgs === 75000);
  const bad = validateDeal({ ...NEW_DEAL, title: '', organizationId: '', ownerId: 'staff-arm-1', estimatedValue: '-5', expectedCloseAt: 'x', stage: 'won' }, seed.organizations, seed.contacts, STAFF, OPEN);
  assert.ok(!bad.ok);
  if (!bad.ok) assert.deepEqual(bad.fields, { title: 'required', organizationId: 'required', ownerId: 'unknown-staff', estimatedValue: 'value-invalid', expectedCloseAt: 'date-invalid', stage: 'stage-invalid' });
  const wrongContact = validateDeal({ ...NEW_DEAL, contactId: 'contact-1' }, seed.organizations, seed.contacts, STAFF);
  assert.ok(!wrongContact.ok && wrongContact.fields.contactId === 'contact-not-in-org');
});

void test('deals: permissions, create / edit / assign audited', () => {
  assert.deepEqual(createDeal(NEW_DEAL, seed.organizations, seed.contacts, STAFF, OPEN, as('crm-viewer')), { ok: false, error: 'forbidden' });
  const created = createDeal(NEW_DEAL, seed.organizations, seed.contacts, STAFF, OPEN, as('crm-manager'));
  assert.ok(created.ok && created.record.stage === 'qualified' && created.audit('d').action === 'deal.create');
  const reassigned = updateDeal(deal('deal-2'), { ...dealInput(deal('deal-2')), ownerId: 'staff-crm-1' }, seed.organizations, seed.contacts, STAFF, as('crm-partnership-lead'));
  assert.ok(reassigned.ok && reassigned.event.action === 'deal.assign' && reassigned.patch.ownerId === 'staff-crm-1');
  const edited = updateDeal(deal('deal-2'), { ...dealInput(deal('deal-2')), title: 'Новое название' }, seed.organizations, seed.contacts, STAFF, as('crm-manager'));
  assert.ok(edited.ok && edited.event.action === 'deal.update' && !('stage' in edited.patch));
});

void test('deal transitions: stage moves, won, lost with a reason, reopen; closed → closed refused', () => {
  const ctx = as('crm-partnership-lead');
  const move = moveDeal(deal('deal-4'), 'proposal', undefined, OPEN, ctx);
  assert.ok(move.ok && move.event.action === 'deal.stage' && move.event.fromStatus === 'qualified' && move.patch.closedAt === undefined);
  const won = moveDeal(deal('deal-1'), 'won', undefined, OPEN, ctx);
  assert.ok(won.ok && won.event.action === 'deal.won' && won.patch.closedAt === NOW);
  assert.deepEqual(moveDeal(deal('deal-1'), 'lost', '', OPEN, ctx), { ok: false, error: 'invalid', fields: { reason: 'required' } });
  assert.deepEqual(moveDeal(deal('deal-1'), 'lost', 'коротко', OPEN, ctx), { ok: false, error: 'invalid', fields: { reason: 'too-short' } });
  const lost = moveDeal(deal('deal-1'), 'lost', 'Лейбл отложил подборку до весны (демо)', OPEN, ctx);
  assert.ok(lost.ok && lost.event.action === 'deal.lost' && lost.patch.lostReason?.includes('весны'));
  assert.deepEqual(moveDeal(deal('deal-3'), 'lost', 'Причина достаточной длины', OPEN, ctx), { ok: false, error: 'invalid-transition' });
  const reopen = moveDeal(deal('deal-7'), 'qualified', undefined, OPEN, ctx);
  assert.ok(reopen.ok && reopen.event.action === 'deal.reopen' && reopen.patch.closedAt === undefined && reopen.patch.lostReason === undefined);
  assert.deepEqual(moveDeal(deal('deal-1'), 'negotiation', undefined, OPEN, ctx), { ok: false, error: 'same-status' });
  assert.deepEqual(moveDeal(deal('deal-1'), 'won', undefined, OPEN, as('crm-viewer')), { ok: false, error: 'forbidden' });
  assert.equal(nextStage('lead', OPEN), 'qualified');
  assert.equal(nextStage('negotiation', OPEN), undefined);
  assert.equal(nextStage('won', OPEN), undefined);
});

void test('tasks: links agree, create pending, completion history, invalid transitions refused', () => {
  const v = validateTask({ ...NEW_TASK, organizationId: '' }, links);
  assert.ok(v.ok && v.value.organizationId === 'org-2', 'organization taken from the deal');
  const clash = validateTask({ ...NEW_TASK, organizationId: 'org-1' }, links);
  assert.ok(!clash.ok && clash.fields.dealId === 'deal-not-in-org');
  const wrongContact = validateTask({ ...NEW_TASK, contactId: 'contact-1' }, links);
  assert.ok(!wrongContact.ok && wrongContact.fields.contactId === 'contact-not-in-org');
  const noAssignee = validateTask({ ...NEW_TASK, assigneeId: '', title: ' ' }, links);
  assert.ok(!noAssignee.ok && noAssignee.fields.assigneeId === 'required' && noAssignee.fields.title === 'required');
  assert.deepEqual(createTask(NEW_TASK, links, as('crm-viewer')), { ok: false, error: 'forbidden' });
  const created = createTask(NEW_TASK, links, as('crm-manager'));
  assert.ok(created.ok && created.record.status === 'pending' && created.audit('x').action === 'task.create');
  const done = changeTaskStatus(task('task-2'), 'completed', undefined, as('crm-manager'));
  assert.ok(done.ok && done.patch.completedAt === NOW && done.patch.completedBy === 'staff-crm-2' && done.event.action === 'task.complete');
  const reopened = changeTaskStatus({ ...task('task-2'), ...(done.ok ? done.patch : {}) } as Task, 'pending', undefined, as('crm-manager'));
  assert.ok(reopened.ok && reopened.event.action === 'task.reopen' && reopened.patch.completedAt === undefined);
  assert.deepEqual(changeTaskStatus(task('task-5'), 'cancelled', undefined, as('crm-manager')), { ok: false, error: 'invalid-transition' });
  const pause = changeTaskStatus(task('task-1'), 'pending', undefined, as('crm-manager'));
  assert.ok(pause.ok && pause.event.action === 'task.pause');
  const cancel = changeTaskStatus(task('task-6'), 'cancelled', 'Фестиваль перенесли (демо)', as('crm-partnership-lead'));
  assert.ok(cancel.ok && cancel.patch.cancelReason === 'Фестиваль перенесли (демо)');
});

void test('agenda merges open tasks and M4 reminders without copying or duplicating them', () => {
  const items = agenda(seed.tasks, seed.interactions, NOW);
  const openTasks = seed.tasks.filter((x) => (x.status === 'pending' || x.status === 'in-progress') && x.dueAt).length;
  const openReminders = seed.interactions.filter((i) => i.followUpAt && !i.followUpDone).length;
  assert.equal(items.length, openTasks + openReminders);
  assert.equal(new Set(items.map((i) => `${i.kind}-${i.id}`)).size, items.length);
  assert.ok(items.every((it, i, arr) => i === 0 || arr[i - 1]!.due <= it.due));
  assert.deepEqual(items.filter((i) => i.overdue).map((i) => i.id).sort(), ['int-5', 'task-1']);
  assert.ok(isOverdueTask(task('task-1'), NOW) && !isOverdueTask(task('task-5'), NOW));
  assert.equal(seed.interactions.length, crmSeed().interactions.length, 'interactions untouched');
});

void test('analytics figures are derived from the records and agree with the dashboard', () => {
  const stages = pipelineByStage(seed.deals, [...OPEN, 'won', 'lost']);
  assert.equal(stages.reduce((s, r) => s + r.count, 0), seed.deals.length);
  const totals = dealTotals(seed.deals);
  assert.deepEqual(totals, { open: 5, won: 1, lost: 1, openEstimateKgs: 425000, wonEstimateKgs: 30000, withoutEstimate: 1 });
  assert.equal(stages.filter((r) => r.stage !== 'won' && r.stage !== 'lost').reduce((s, r) => s + r.estimateKgs, 0), totals.openEstimateKgs);
  const tasks = taskTotals(seed.tasks, NOW);
  assert.deepEqual(tasks, { byStatus: { pending: 5, 'in-progress': 1, completed: 1, cancelled: 1 }, open: 6, overdue: 1, completedInPeriod: 1 });
  assert.equal(taskTotals(seed.tasks, NOW, periodStart('7d', NOW)).completedInPeriod, 1);
  assert.equal(reminderTotals(seed.interactions, NOW).open, crmSummary(seed, NOW).openFollowUps, 'reminder count matches the dashboard card');
  assert.equal(Object.values(interactionsByKind(seed.interactions, NOW)).reduce((a, b) => a + b, 0), seed.interactions.length);
  assert.equal(interactionsByKind(seed.interactions, NOW, periodStart('7d', NOW)).note, 1);
  const staff = staffActivity(DEMO_STAFF, seed, NOW);
  assert.equal(staff.length, 3);
  assert.equal(staff.reduce((s, r) => s + r.openDeals, 0), totals.open);
  assert.equal(staff.reduce((s, r) => s + r.openTasks, 0), tasks.open);
});

void test('migration v2 → v3 keeps M4 records and local edits, adds the M5 data once', async () => {
  const m4 = crmSeed();
  const savedV2 = {
    version: 2,
    nextId: 7,
    data: {
      contacts: [...m4.contacts, { ...m4.contacts[0]!, id: 'contacts-mmusic-crm-5', name: 'Локальный контакт' }],
      organizations: m4.organizations,
      interactions: m4.interactions,
      activity: [{ id: 'activity-mmusic-crm-6', mock: true, at: NOW, actorId: 'staff-crm-2', actorRoleId: 'crm-manager', action: 'contact.create', entity: { type: 'contact', id: 'contacts-mmusic-crm-5', label: 'Локальный контакт' } }],
    },
  };
  const next = migrateCrmData(savedV2)!;
  assert.equal(next.version, CRM_DATA_VERSION);
  assert.equal(next.nextId, 7);
  assert.equal((next.data.contacts as unknown[]).length, m4.contacts.length + 1);
  assert.equal((next.data.deals as Deal[]).length, seed.deals.length);
  assert.equal((next.data.tasks as Task[]).length, seed.tasks.length);
  assert.equal((next.data.activity as unknown[]).length, 1 + seed.activity.length);
  assert.equal(migrateCrmData(next), undefined, 'v3 data is left alone');
  assert.equal(migrateCrmData({ version: 2, nextId: 1, data: { contacts: [] } }), undefined, 'broken shape is not migrated');
  assert.equal(migrateCrmData(undefined), undefined);

  const storage = createSafeStorage(memoryBackend());
  storage.setJSON(CRM_DATA_KEY, savedV2);
  assert.equal(migrateStoredCrmData(storage), true);
  const ds = createMockDataSource<CrmCollections>({ namespace: 'mmusic-crm', version: CRM_DATA_VERSION, seed: crmSeed, storage });
  assert.equal((await ds.repository('contacts').get('contacts-mmusic-crm-5'))?.name, 'Локальный контакт', 'the M4 edit survived (no re-seed)');
  assert.equal((await ds.repository('deals').list()).length, seed.deals.length);
  ds.reset();
  assert.equal(await ds.repository('contacts').get('contacts-mmusic-crm-5'), undefined, 'reset restores the original demo data');
  assert.equal((await ds.repository('tasks').list()).length, seed.tasks.length);
});
