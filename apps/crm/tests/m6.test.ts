import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMockDataSource } from '@mmusic/backoffice/data';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { createSafeStorage, type StorageBackend } from '@mmusic/backoffice/storage';

import { pipelineByStage } from '../src/domain/analytics.ts';
import { CRM_DATA_KEY, CRM_DATA_VERSION, migrateCrmData, migrateStoredCrmData } from '../src/domain/migrate.ts';
import { applyRoleChanges, assignStaffRole, buildCrmMatrix, CRM_PERMISSION_KEYS, crmCan, defaultRoleConfigs, DEFAULT_ROLE_PERMISSIONS, lockReason, resetRole, toggle, type CrmContext } from '../src/domain/permissions.ts';
import { moveDeal } from '../src/domain/pipeline.ts';
import { crmSeed } from '../src/domain/seed.ts';
import { addStage, addTag, boardStages, deleteStage, deleteTag, disableStage, enableStage, moveStage, openStages, renameStage, renameTag, tagUsage, updatePreferences } from '../src/domain/settings.ts';
import type { CrmCollections, RoleConfig, StageConfig } from '../src/domain/types.ts';

const NOW = '2026-10-21T12:00:00.000Z';
const configs = defaultRoleConfigs();
const matrix = buildCrmMatrix(configs);
const staffOf = (roleId: string) => DEMO_STAFF.find((s) => s.roleId === roleId)?.id ?? 'x';
const as = (roleId: string, m = matrix): CrmContext => ({ matrix: m, actor: { staffId: staffOf(roleId), roleId }, now: NOW });
const seed = crmSeed();
const OPEN = openStages(seed.pipeline).map((s) => s.id);
const deal = (id: string) => seed.deals.find((d) => d.id === id)!;

function memoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

void test('default matrix: lead everything, manager no closing / settings / roles, viewer view only; dashboard always on', () => {
  assert.equal(DEFAULT_ROLE_PERMISSIONS['crm-partnership-lead'].length, CRM_PERMISSION_KEYS.length);
  assert.deepEqual(
    CRM_PERMISSION_KEYS.filter((p) => !crmCan(matrix, 'crm-manager', p)),
    ['crm.deals.close', 'crm.settings.manage', 'crm.roles.manage'],
  );
  assert.ok(CRM_PERMISSION_KEYS.filter((p) => crmCan(matrix, 'crm-viewer', p)).every((p) => p.endsWith('.view')));
  for (const role of ['crm-partnership-lead', 'crm-manager', 'crm-viewer']) assert.ok(crmCan(matrix, role, 'crm.dashboard.view'), role);
  assert.equal(crmCan(matrix, 'arm-super-admin', 'crm.contacts.view'), false, 'ARM roles have no CRM rights');
  assert.equal(crmCan(matrix, undefined, 'crm.dashboard.view'), false);
});

void test('closing a deal is a distinct right: the manager moves open stages but cannot mark won / lost or reopen', () => {
  assert.ok(moveDeal(deal('deal-4'), 'proposal', undefined, OPEN, as('crm-manager')).ok);
  assert.deepEqual(moveDeal(deal('deal-1'), 'won', undefined, OPEN, as('crm-manager')), { ok: false, error: 'forbidden' });
  assert.deepEqual(moveDeal(deal('deal-1'), 'lost', 'Причина достаточной длины', OPEN, as('crm-manager')), { ok: false, error: 'forbidden' });
  assert.deepEqual(moveDeal(deal('deal-7'), 'qualified', undefined, OPEN, as('crm-manager')), { ok: false, error: 'forbidden' });
  assert.ok(moveDeal(deal('deal-1'), 'won', undefined, OPEN, as('crm-partnership-lead')).ok);
  assert.deepEqual(moveDeal(deal('deal-4'), 'proposal', undefined, OPEN, as('crm-viewer')), { ok: false, error: 'forbidden' });
  const granted = applyRoleChanges(configs, [{ roleId: 'crm-manager', permission: 'crm.deals.close', on: true }], as('crm-partnership-lead'));
  assert.ok(granted.ok);
  if (!granted.ok) return;
  const next = configs.map((c) => ({ ...c, permissions: granted.patches.find((p) => p.id === c.id)?.permissions ?? c.permissions }));
  assert.ok(moveDeal(deal('deal-1'), 'won', undefined, OPEN, as('crm-manager', buildCrmMatrix(next))).ok, 'granted in the matrix → allowed');
  assert.deepEqual(moveDeal(deal('deal-1'), 'stage-x', undefined, OPEN, as('crm-partnership-lead')), { ok: false, error: 'invalid-transition' }, 'unknown / disabled stage refused');
});

void test('role matrix edits: locks, dependencies, audit events, permission to manage', () => {
  assert.equal(lockReason('crm-viewer', 'crm.contacts.edit'), 'viewer-read-only');
  assert.equal(lockReason('crm-partnership-lead', 'crm.roles.manage'), 'lead-keeps-roles');
  assert.equal(lockReason('crm-manager', 'crm.dashboard.view'), 'always');
  assert.equal(lockReason('crm-manager', 'crm.deals.close'), undefined);
  assert.deepEqual(applyRoleChanges(configs, [{ roleId: 'crm-viewer', permission: 'crm.tasks.edit', on: true }], as('crm-partnership-lead')), { ok: false, error: 'locked' });
  assert.deepEqual(applyRoleChanges(configs, [{ roleId: 'crm-partnership-lead', permission: 'crm.roles.manage', on: false }], as('crm-partnership-lead')), { ok: false, error: 'locked' });
  assert.deepEqual(applyRoleChanges(configs, [{ roleId: 'crm-manager', permission: 'crm.reports.view', on: false }], as('crm-manager')), { ok: false, error: 'forbidden' });
  const out = applyRoleChanges(configs, [{ roleId: 'crm-manager', permission: 'crm.tasks.view', on: false }], as('crm-partnership-lead'));
  assert.ok(out.ok);
  if (out.ok) {
    const manager = out.patches.find((p) => p.id === 'crm-manager')!;
    assert.ok(!manager.permissions.includes('crm.tasks.view') && !manager.permissions.includes('crm.tasks.edit'), 'edit follows view');
    assert.deepEqual(out.events.map((e) => `${e.action} ${e.reason}`).sort(), ['role.revoke crm.tasks.edit', 'role.revoke crm.tasks.view']);
  }
  assert.deepEqual([...toggle(new Set(['crm.deals.view']), 'crm.deals.close', true)].sort(), ['crm.deals.close', 'crm.deals.edit', 'crm.deals.view'], 'close pulls edit and view');
  assert.deepEqual(applyRoleChanges(configs, [], as('crm-partnership-lead')), { ok: false, error: 'same-status' });
  const changed: RoleConfig[] = configs.map((c) => (c.id === 'crm-manager' ? { ...c, permissions: c.permissions.filter((p) => p !== 'crm.reports.view') } : c));
  const reset = resetRole(changed.find((c) => c.id === 'crm-manager')!, as('crm-partnership-lead'));
  assert.ok(reset.ok && reset.patch.permissions.includes('crm.reports.view') && reset.event.action === 'role.reset');
});

void test('staff role assignment: audited, the last lead is protected', () => {
  const assignments = seed.staffRoles;
  assert.deepEqual(assignStaffRole('staff-crm-1', 'Данияр Осмонов', 'crm-manager', assignments, as('crm-partnership-lead')), { ok: false, error: 'last-lead' });
  const ok = assignStaffRole('staff-crm-3', 'Руслан Бекматов', 'crm-manager', assignments, as('crm-partnership-lead'));
  assert.ok(ok.ok && ok.event.action === 'staff.role' && ok.event.fromStatus === 'crm-viewer' && ok.event.toStatus === 'crm-manager');
  assert.deepEqual(assignStaffRole('staff-crm-3', 'Руслан Бекматов', 'crm-manager', assignments, as('crm-manager')), { ok: false, error: 'forbidden' });
  assert.deepEqual(assignStaffRole('staff-crm-3', 'Руслан Бекматов', 'arm-super-admin', assignments, as('crm-partnership-lead')), { ok: false, error: 'unknown-role' });
});

void test('pipeline settings: stable ids, unique labels, order, disable with an explicit move, safe delete', () => {
  const lead = as('crm-partnership-lead');
  assert.deepEqual(addStage({ ru: 'Лид', en: 'X' }, seed.pipeline, lead), { ok: false, error: 'invalid', fields: { ru: 'duplicate' } });
  assert.deepEqual(addStage({ ru: 'Пилот', en: 'Pilot' }, seed.pipeline, as('crm-manager')), { ok: false, error: 'forbidden' });
  const added = addStage({ ru: ' Пилот ', en: 'Pilot' }, seed.pipeline, lead);
  assert.ok(added.ok && added.record.id === 'stage-1' && added.record.label.ru === 'Пилот' && added.record.custom && added.event.action === 'stage.create');
  if (!added.ok) return;
  const config: StageConfig[] = [...seed.pipeline, added.record];
  assert.equal(openStages(config).at(-1)?.id, 'stage-1');
  assert.deepEqual(boardStages(config).slice(-2).map((s) => s.id), ['won', 'lost']);
  const renamed = renameStage('lead', { ru: 'Новый лид', en: 'New lead' }, config, lead);
  assert.ok(renamed.ok && renamed.patch.patch.label?.ru === 'Новый лид' && renamed.event.reason === 'Лид → Новый лид');
  const moved = moveStage('qualified', -1, config, lead);
  assert.ok(moved.ok && moved.patches.find((p) => p.id === 'qualified')?.patch.order === 1);
  assert.deepEqual(moveStage('won', -1, config, lead), { ok: false, error: 'system-stage' });
  assert.deepEqual(disableStage('qualified', undefined, config, seed.deals, lead), { ok: false, error: 'invalid', fields: { target: 'required' } });
  const off = disableStage('qualified', 'proposal', config, seed.deals, lead);
  assert.ok(off.ok);
  if (off.ok) {
    assert.deepEqual(off.dealPatches.map((p) => `${p.id}→${p.patch.stage}`).sort(), ['deal-4→proposal', 'deal-6→proposal', 'deal-a1→proposal']); // + the artist demo deal
    assert.ok(off.events.filter((e) => e.action === 'deal.stage').every((e) => e.fromStatus === 'qualified' && e.toStatus === 'proposal'));
    assert.equal(off.events.at(-1)?.action, 'stage.disable');
  }
  assert.ok(disableStage('stage-1', undefined, config, seed.deals, lead).ok, 'an empty stage needs no move');
  const single = config.map((s) => (s.kind === 'open' && s.id !== 'lead' ? { ...s, enabled: false } : s));
  assert.deepEqual(disableStage('lead', 'x', single, seed.deals, lead), { ok: false, error: 'last-open-stage' });
  assert.ok(enableStage('qualified', single, lead).ok);
  assert.deepEqual(deleteStage('lead', config, seed.deals, seed.activity, lead), { ok: false, error: 'system-stage' });
  assert.ok(deleteStage('stage-1', config, seed.deals, seed.activity, lead).ok, 'unused custom stage can be deleted');
  const used = [...seed.deals, { ...seed.deals[0]!, id: 'deal-x', stage: 'stage-1' }];
  assert.deepEqual(deleteStage('stage-1', config, used, seed.activity, lead), { ok: false, error: 'in-use' });
  assert.equal(pipelineByStage(used, boardStages(config).filter((s) => s.id !== 'stage-1').map((s) => s.id)).reduce((n, r) => n + r.count, 0), used.length, 'stages not shown still count');
});

void test('tags: usage across contacts and organizations, add / rename / delete update every record', () => {
  const lead = as('crm-partnership-lead');
  const usage = tagUsage(seed.tags, seed.contacts, seed.organizations);
  assert.deepEqual(usage.find((u) => u.name === 'лейбл'), { name: 'лейбл', contacts: 1, organizations: 1 });
  assert.deepEqual(usage.find((u) => u.name === 'приоритет'), { name: 'приоритет', contacts: 0, organizations: 0 });
  const names = usage.map((u) => u.name);
  assert.deepEqual(addTag(' Лейбл ', names, lead), { ok: false, error: 'invalid', fields: { name: 'duplicate' } });
  assert.deepEqual(addTag('а, б', names, lead), { ok: false, error: 'invalid', fields: { name: 'tag-invalid' } });
  assert.ok(addTag('Пресса', names, lead).ok);
  const data = { records: seed.tags, contacts: seed.contacts, organizations: seed.organizations };
  const renamed = renameTag('медиа', 'Медиа-партнёр', data, lead);
  assert.ok(renamed.ok);
  if (renamed.ok) {
    assert.ok(renamed.contactPatches.every((p) => p.patch.tags?.includes('медиа-партнёр') && !p.patch.tags.includes('медиа')));
    assert.equal(renamed.organizationPatches.length, 2);
    assert.equal(renamed.newRecord?.name, 'медиа-партнёр');
  }
  assert.deepEqual(renameTag('медиа', 'лейбл', data, lead), { ok: false, error: 'invalid', fields: { name: 'duplicate' } });
  const removed = deleteTag('лейбл', data, lead);
  assert.ok(removed.ok && removed.contactPatches[0]!.patch.tags!.length === 0 && removed.organizationPatches.length === 1);
  assert.deepEqual(deleteTag('нет-такого', data, lead), { ok: false, error: 'not-found' });
  assert.deepEqual(deleteTag('лейбл', data, as('crm-viewer')), { ok: false, error: 'forbidden' });
});

void test('preferences: validated, audited, unchanged values refused', () => {
  const prefs = seed.preferences[0]!;
  const ok = updatePreferences(prefs, { dealsView: 'list', agendaSize: 8, taskPriority: 'high' }, as('crm-partnership-lead'));
  assert.ok(ok.ok && ok.event.action === 'settings.preferences' && ok.event.reason === 'dealsView, agendaSize, taskPriority');
  assert.deepEqual(updatePreferences(prefs, { dealsView: 'board', agendaSize: 6, taskPriority: 'normal' }, as('crm-partnership-lead')), { ok: false, error: 'same-status' });
  assert.deepEqual(updatePreferences(prefs, { dealsView: 'board', agendaSize: 5, taskPriority: 'normal' }, as('crm-partnership-lead')), { ok: false, error: 'invalid', fields: { agendaSize: 'required' } });
  assert.deepEqual(updatePreferences(prefs, { dealsView: 'list', agendaSize: 6, taskPriority: 'normal' }, as('crm-manager')), { ok: false, error: 'forbidden' });
});

void test('migration v3 → v4 keeps every M5 record and edit; v2 data upgrades in one go; reset restores the defaults', async () => {
  const m5 = crmSeed();
  const savedV3 = {
    version: 3,
    nextId: 42,
    data: {
      contacts: m5.contacts,
      organizations: m5.organizations.map((o) => ({ ...o, tags: undefined })),
      interactions: m5.interactions,
      deals: [...m5.deals, { ...m5.deals[0]!, id: 'deals-mmusic-crm-9', title: 'Локальная сделка', stage: 'qualified' }],
      tasks: m5.tasks,
      activity: m5.activity,
    },
  };
  const v4 = migrateCrmData(savedV3)!;
  assert.equal(v4.version, CRM_DATA_VERSION);
  assert.equal(v4.nextId, 42);
  assert.equal((v4.data.deals as unknown[]).length, m5.deals.length + 1, 'local deal kept');
  assert.deepEqual((v4.data.roles as RoleConfig[]).map((r) => r.id), ['crm-partnership-lead', 'crm-manager', 'crm-viewer']);
  assert.equal((v4.data.pipeline as StageConfig[]).length, 6);
  assert.equal(migrateCrmData(v4), undefined, 'current data untouched');
  const fromV2 = migrateCrmData({ version: 2, nextId: 3, data: { contacts: m5.contacts, organizations: m5.organizations, interactions: m5.interactions, activity: [] } })!;
  assert.equal(fromV2.version, CRM_DATA_VERSION);
  assert.ok(Array.isArray(fromV2.data.deals) && Array.isArray(fromV2.data.staffRoles));
  const odd = migrateCrmData({ ...savedV3, data: { ...savedV3.data, deals: [{ ...m5.deals[0]!, stage: 'pilot' }] } })!;
  assert.ok((odd.data.pipeline as StageConfig[]).some((s) => s.id === 'pilot' && s.custom), 'unknown saved stage kept as a custom stage');

  const storage = createSafeStorage(memoryBackend());
  storage.setJSON(CRM_DATA_KEY, savedV3);
  assert.ok(migrateStoredCrmData(storage));
  const ds = createMockDataSource<CrmCollections>({ namespace: 'mmusic-crm', version: CRM_DATA_VERSION, seed: crmSeed, storage });
  assert.equal((await ds.repository('deals').get('deals-mmusic-crm-9'))?.title, 'Локальная сделка');
  await ds.repository('roles').update('crm-manager', { permissions: ['crm.dashboard.view'] });
  ds.reset();
  assert.equal(await ds.repository('deals').get('deals-mmusic-crm-9'), undefined);
  assert.equal((await ds.repository('roles').get('crm-manager'))?.permissions.length, DEFAULT_ROLE_PERMISSIONS['crm-manager'].length, 'reset restores default rights');
});
