import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMockDataSource } from '@mmusic/backoffice/data';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { buildMatrix, DEFAULT_ROLES, rolesFor } from '@mmusic/backoffice/rbac';
import { createSafeStorage, type StorageBackend } from '@mmusic/backoffice/storage';

import { ARM_DATA_KEY, ARM_DATA_VERSION, migrateArmData, migrateStoredArmData } from '../src/domain/migrate.ts';
import { applyRoleChanges, ARM_PERMISSION_KEYS, armCan, assignStaffRole, buildArmMatrix, decisionContext, defaultRoleConfigs, DEFAULT_ROLE_PERMISSIONS, lockReason, resetRole, toggle, type ArmContext } from '../src/domain/permissions.ts';
import { armSeed } from '../src/domain/seed.ts';
import { defaultM6Data, defaultPreferences, updatePreferences } from '../src/domain/settings.ts';
import type { ArmCollections, RoleConfig } from '../src/domain/types.ts';
import { changeListing, changeUserStatus, decideCampaign, decideSubmission, reviewArtist } from '../src/domain/workflow.ts';

const NOW = '2026-10-21T12:00:00.000Z';
const REASON = 'Нужна правка метаданных релиза';
const ctxWith = (configs: RoleConfig[], roleId: string): ArmContext => ({ matrix: buildArmMatrix(configs), actor: { staffId: DEMO_STAFF.find((s) => s.roleId === roleId)?.id ?? `role:${roleId}`, roleId }, now: NOW });
const as = (roleId: string) => ctxWith(defaultRoleConfigs(), roleId);
const seed = armSeed();

function memoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

void test('M6 defaults keep the approved ARM roles; only the super admin gets arm.roles.manage', () => {
  const shared = buildMatrix(DEFAULT_ROLES);
  const arm = buildArmMatrix(defaultRoleConfigs());
  for (const role of rolesFor('arm')) {
    for (const p of ARM_PERMISSION_KEYS.filter((k) => k !== 'arm.roles.manage')) assert.equal(armCan(arm, role.id, p), shared[role.id]!.has(p as never), `${role.id} ${p}`);
    assert.equal(armCan(arm, role.id, 'arm.roles.manage'), role.id === 'arm-super-admin');
  }
  assert.ok(ARM_PERMISSION_KEYS.every((p) => p.startsWith('arm.')), 'ARM matrix holds no CRM right');
  assert.equal(armCan(arm, 'crm-partnership-lead', 'arm.dashboard.view'), false, 'unknown roles fail closed');
});

void test('locks: dashboard always on, finance and analyst view-only, super admin keeps role management', () => {
  assert.equal(lockReason('arm-moderator', 'arm.dashboard.view'), 'always');
  assert.equal(lockReason('arm-analyst', 'arm.moderation.decide'), 'read-only-role');
  assert.equal(lockReason('arm-finance', 'arm.campaigns.decide'), 'read-only-role');
  assert.equal(lockReason('arm-finance', 'arm.users.view'), undefined, 'read-only roles may get more view rights');
  assert.equal(lockReason('arm-super-admin', 'arm.roles.manage'), 'super-keeps-roles');
  assert.equal(lockReason('arm-moderator', 'arm.users.edit'), undefined);
  const out = applyRoleChanges(defaultRoleConfigs(), [{ roleId: 'arm-analyst', permission: 'arm.moderation.decide', on: true }], as('arm-super-admin'));
  assert.deepEqual(out, { ok: false, error: 'locked' });
  assert.deepEqual(applyRoleChanges(defaultRoleConfigs(), [{ roleId: 'arm-super-admin', permission: 'arm.roles.manage', on: false }], as('arm-super-admin')), { ok: false, error: 'locked' });
});

void test('dependencies: a decision right needs its view right', () => {
  assert.deepEqual(toggle(new Set(), 'arm.campaigns.decide', true), new Set(['arm.campaigns.decide', 'arm.campaigns.view']));
  assert.deepEqual([...toggle(new Set(['arm.users.view', 'arm.users.edit']), 'arm.users.view', false)], []);
});

void test('saving the matrix needs arm.roles.manage and writes one audit event per change', () => {
  const change = [{ roleId: 'arm-support', permission: 'arm.campaigns.decide' as const, on: true }];
  for (const role of ['arm-moderator', 'arm-support', 'arm-finance', 'arm-analyst']) assert.deepEqual(applyRoleChanges(defaultRoleConfigs(), change, as(role)), { ok: false, error: 'forbidden' });
  const out = applyRoleChanges(defaultRoleConfigs(), change, as('arm-super-admin'));
  assert.ok(out.ok);
  assert.deepEqual(out.patches.map((p) => p.id), ['arm-support']);
  assert.deepEqual(out.events.map((e) => [e.action, e.reason]), [['role.grant', 'arm.campaigns.view'], ['role.grant', 'arm.campaigns.decide']]);
  assert.equal(out.events[0]!.actorId, 'staff-arm-1');
});

void test('domain actions follow the edited matrix, not the static defaults', () => {
  const sub = seed.submissions.find((s) => s.kind === 'track' && s.status === 'pending')!;
  const configs = defaultRoleConfigs().map((c) => (c.id === 'arm-moderator' ? { ...c, permissions: c.permissions.filter((p) => p !== 'arm.moderation.decide') } : c));
  assert.deepEqual(decideSubmission(sub, 'reject', REASON, decisionContext(ctxWith(configs, 'arm-moderator'))), { ok: false, error: 'forbidden' });
  assert.ok(decideSubmission(sub, 'reject', REASON, decisionContext(as('arm-moderator'))).ok);
  const support = defaultRoleConfigs().map((c) => (c.id === 'arm-support' ? { ...c, permissions: [...c.permissions, 'arm.artists.edit', 'arm.campaigns.view', 'arm.campaigns.decide', 'arm.catalog.view', 'arm.catalog.edit'] } : c));
  const artist = seed.artists.find((a) => a.status === 'pending')!;
  assert.deepEqual(reviewArtist(artist, 'approve', undefined, decisionContext(as('arm-support'))), { ok: false, error: 'forbidden' });
  assert.ok(reviewArtist(artist, 'approve', undefined, decisionContext(ctxWith(support, 'arm-support'))).ok);
  const user = seed.users.find((u) => u.role === 'listener' && u.status === 'active')!;
  const noUsers = defaultRoleConfigs().map((c) => (c.id === 'arm-support' ? { ...c, permissions: c.permissions.filter((p) => p !== 'arm.users.edit') } : c));
  assert.deepEqual(changeUserStatus(user, 'suspended', REASON, decisionContext(ctxWith(noUsers, 'arm-support'))), { ok: false, error: 'forbidden' });
  const camp = seed.campaigns.find((c) => c.status === 'pending')!;
  assert.deepEqual(decideCampaign(camp, undefined, 'reject', REASON, decisionContext(as('arm-support'))), { ok: false, error: 'forbidden' });
  assert.ok(decideCampaign(camp, undefined, 'reject', REASON, decisionContext(ctxWith(support, 'arm-support'))).ok);
  const listed = seed.submissions.find((s) => s.status === 'approved')!;
  assert.ok(changeListing(listed, 'unlisted', REASON, decisionContext(ctxWith(support, 'arm-support'))).ok);
  assert.deepEqual(changeListing(listed, 'unlisted', REASON, decisionContext(as('arm-analyst'))), { ok: false, error: 'forbidden' });
});

void test('reset role and staff assignment: audit, last super admin protected', () => {
  const edited = defaultRoleConfigs().map((c) => (c.id === 'arm-moderator' ? { ...c, permissions: ['arm.dashboard.view'] } : c));
  const reset = resetRole(edited.find((c) => c.id === 'arm-moderator')!, as('arm-super-admin'));
  assert.ok(reset.ok);
  assert.deepEqual(reset.patch.permissions, [...DEFAULT_ROLE_PERMISSIONS['arm-moderator']]);
  assert.equal(reset.event.action, 'role.reset');
  assert.deepEqual(resetRole(defaultRoleConfigs()[1]!, as('arm-super-admin')), { ok: false, error: 'same-status' });
  assert.deepEqual(resetRole(edited[1]!, as('arm-moderator')), { ok: false, error: 'forbidden' });

  const staff = defaultM6Data().staffRoles;
  assert.deepEqual(assignStaffRole('staff-arm-1', 'Айгерим', 'arm-analyst', staff, as('arm-super-admin')), { ok: false, error: 'last-super-admin' });
  const promoted = assignStaffRole('staff-arm-2', 'Нурбек', 'arm-super-admin', staff, as('arm-super-admin'));
  assert.ok(promoted.ok);
  assert.deepEqual([promoted.event.action, promoted.event.fromStatus, promoted.event.toStatus], ['staff.role', 'arm-moderator', 'arm-super-admin']);
  const two = staff.map((a) => (a.id === 'staff-arm-2' ? { ...a, roleId: 'arm-super-admin' } : a));
  assert.ok(assignStaffRole('staff-arm-1', 'Айгерим', 'arm-analyst', two, as('arm-super-admin')).ok);
  assert.deepEqual(assignStaffRole('staff-arm-3', 'Элина', 'arm-moderator', staff, as('arm-support')), { ok: false, error: 'forbidden' });
  assert.deepEqual(assignStaffRole('staff-arm-3', 'Элина', 'crm-manager', staff, as('arm-super-admin')), { ok: false, error: 'unknown-role' });
});

void test('settings: arm.settings.manage only, validated, audited by field', () => {
  const prefs = defaultPreferences();
  const next = { ...prefs, moderationStatus: 'pending' as const, recentActivity: 10 };
  assert.deepEqual(updatePreferences(prefs, next, as('arm-moderator')), { ok: false, error: 'forbidden' });
  assert.deepEqual(updatePreferences(prefs, { ...next, recentActivity: 99 }, as('arm-super-admin')), { ok: false, error: 'invalid' });
  assert.deepEqual(updatePreferences(prefs, { ...next, catalogTab: 'payments' as never }, as('arm-super-admin')), { ok: false, error: 'invalid' });
  assert.deepEqual(updatePreferences(prefs, prefs, as('arm-super-admin')), { ok: false, error: 'same-status' });
  const out = updatePreferences(prefs, next, as('arm-super-admin'));
  assert.ok(out.ok);
  assert.equal(out.event.action, 'settings.preferences');
  assert.equal(out.event.reason, 'moderationStatus, recentActivity');
});

void test('migration v4 → v5 keeps every M2 / M3 record and local decision; reset restores the default ARM state', async () => {
  const storage = createSafeStorage(memoryBackend());
  const m3Seed = () => {
    const { roles: _r, staffRoles: _s, preferences: _p, ...rest } = armSeed();
    return rest;
  };
  const v4 = createMockDataSource<Omit<ArmCollections, 'roles' | 'staffRoles' | 'preferences'>>({ namespace: 'mmusic-arm', version: 4, seed: m3Seed, storage });
  await v4.repository('submissions').update('sub-demo-horizon', { status: 'rejected', reason: REASON });
  await v4.repository('activity').create({ at: NOW, actorId: 'staff-arm-2', actorRoleId: 'arm-moderator', action: 'track.reject', entity: { type: 'track', id: 'sub-demo-horizon', label: 'Horizon' }, reason: REASON });
  const before = storage.getJSON<{ data: Record<string, unknown[]>; nextId: number }>(ARM_DATA_KEY)!;

  assert.equal(migrateStoredArmData(storage), true);
  assert.equal(migrateStoredArmData(storage), false, 'idempotent');
  const ds = createMockDataSource<ArmCollections>({ namespace: 'mmusic-arm', version: ARM_DATA_VERSION, seed: armSeed, storage });
  for (const name of ['submissions', 'artists', 'users', 'campaigns', 'transactions', 'activity'] as const) assert.deepEqual(await ds.repository(name).list(), before.data[name], name);
  assert.equal((await ds.repository('submissions').get('sub-demo-horizon'))?.status, 'rejected');
  assert.deepEqual(await ds.repository('roles').list(), defaultRoleConfigs());
  assert.equal((await ds.repository('staffRoles').list()).length, 5);
  assert.deepEqual(await ds.repository('preferences').list(), [defaultPreferences()]);
  assert.equal(ds.store.getState().nextId, before.nextId);

  await ds.repository('roles').update('arm-moderator', { permissions: ['arm.dashboard.view'] });
  ds.reset();
  assert.deepEqual(await ds.repository('roles').list(), defaultRoleConfigs());
  assert.equal((await ds.repository('submissions').get('sub-demo-horizon'))?.status, 'pending');

  assert.equal(migrateArmData({ version: 3, nextId: 1, data: {} }), undefined, 'older data re-seeds as before');
  assert.equal(migrateArmData({ version: 4, nextId: 1, data: { submissions: [] } }), undefined, 'broken shape re-seeds');
});
