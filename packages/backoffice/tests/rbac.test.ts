import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ARM_PERMISSIONS, buildMatrix, can, CRM_PERMISSIONS, DEFAULT_ROLES, invalidPermissions, rolesFor, withOverrides } from '../src/rbac.ts';

const matrix = buildMatrix(DEFAULT_ROLES);

void test('the approved provisional roles exist for each app', () => {
  assert.deepEqual(rolesFor('arm').map((r) => r.id), ['arm-super-admin', 'arm-moderator', 'arm-support', 'arm-finance', 'arm-analyst']);
  assert.deepEqual(rolesFor('crm').map((r) => r.id), ['crm-partnership-lead', 'crm-manager', 'crm-viewer']);
  assert.ok(DEFAULT_ROLES.every((r) => r.provisional === true));
});

void test('roles only hold permissions of their own app', () => {
  for (const role of DEFAULT_ROLES) assert.deepEqual(invalidPermissions(role), [], role.id);
});

void test('every role can open its app dashboard', () => {
  for (const role of DEFAULT_ROLES) assert.ok(can(matrix, role.id, `${role.app}.dashboard.view` as 'arm.dashboard.view'), role.id);
});

void test('super admin and partnerships lead hold every permission of their app', () => {
  for (const p of ARM_PERMISSIONS) assert.ok(can(matrix, 'arm-super-admin', p), p);
  for (const p of CRM_PERMISSIONS) assert.ok(can(matrix, 'crm-partnership-lead', p), p);
});

void test('view-only roles never edit, decide or manage', () => {
  for (const id of ['arm-analyst', 'crm-viewer']) {
    const perms = [...(matrix[id] ?? [])];
    assert.ok(perms.length > 0, id);
    assert.ok(perms.every((p) => p.endsWith('.view')), id);
  }
});

void test('finance sees payments but cannot moderate; moderators cannot see payments', () => {
  assert.ok(can(matrix, 'arm-finance', 'arm.payments.view'));
  assert.ok(!can(matrix, 'arm-finance', 'arm.moderation.decide'));
  assert.ok(can(matrix, 'arm-moderator', 'arm.moderation.decide'));
  assert.ok(!can(matrix, 'arm-moderator', 'arm.payments.view'));
});

void test('a CRM role has no ARM rights and vice versa', () => {
  assert.ok(!can(matrix, 'crm-partnership-lead', 'arm.dashboard.view'));
  assert.ok(!can(matrix, 'arm-super-admin', 'crm.dashboard.view'));
});

void test('unknown or missing roles fail closed', () => {
  assert.ok(!can(matrix, 'nobody', 'arm.dashboard.view'));
  assert.ok(!can(matrix, undefined, 'crm.dashboard.view'));
});

void test('the matrix is configurable: grant and revoke per role without changing the defaults', () => {
  const custom = buildMatrix(withOverrides(DEFAULT_ROLES, { 'arm-support': { grant: ['arm.reports.view'], revoke: ['arm.users.edit'] } }));
  assert.ok(can(custom, 'arm-support', 'arm.reports.view'));
  assert.ok(!can(custom, 'arm-support', 'arm.users.edit'));
  assert.ok(!can(matrix, 'arm-support', 'arm.reports.view'), 'defaults unchanged');
  assert.ok(can(matrix, 'arm-support', 'arm.users.edit'), 'defaults unchanged');
});
