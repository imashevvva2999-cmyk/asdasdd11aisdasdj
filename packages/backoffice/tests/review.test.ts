import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildMatrix, DEFAULT_ROLES } from '../src/rbac.ts';
import { auditEvent, checkReason, decide, DECISION_RESULT, MIN_REASON_LENGTH, REVIEW_DECISIONS, reasonRequired, validateReview, type ReviewStatus } from '../src/review.ts';

const matrix = buildMatrix(DEFAULT_ROLES);
const NOW = '2026-10-21T12:00:00.000Z';
const moderator = { matrix, actor: { staffId: 'staff-arm-2', roleId: 'arm-moderator' }, now: NOW };
const finance = { matrix, actor: { staffId: 'staff-arm-4', roleId: 'arm-finance' }, now: NOW };
const item = (status: ReviewStatus = 'pending') => ({ id: 'sub-1', status });
const REASON = 'Нет прав на семпл в припеве';

void test('decisions map to the expected statuses', () => {
  assert.deepEqual(DECISION_RESULT, { approve: 'approved', reject: 'rejected', 'request-changes': 'changes-requested' });
});

void test('approve needs no reason; reject and request changes do', () => {
  assert.equal(reasonRequired('approve'), false);
  assert.equal(reasonRequired('reject'), true);
  assert.equal(reasonRequired('request-changes'), true);
});

void test('reason validation: missing, whitespace and too short are refused', () => {
  assert.equal(checkReason(undefined, true), 'reason-required');
  assert.equal(checkReason('    ', true), 'reason-required');
  assert.equal(checkReason('x'.repeat(MIN_REASON_LENGTH - 1), true), 'reason-too-short');
  assert.equal(checkReason(`  ${'x'.repeat(MIN_REASON_LENGTH)}  `, true), null);
  assert.equal(checkReason(undefined, false), null);
});

void test('a moderator can approve a pending track; the patch and audit event are complete', () => {
  const out = decide(item(), 'approve', undefined, { type: 'track', label: 'Песня (демо)' }, 'arm.moderation.decide', moderator);
  assert.ok(out.ok);
  if (!out.ok) return;
  assert.deepEqual(out.patch, { status: 'approved', decidedAt: NOW, decidedBy: 'staff-arm-2', reason: undefined });
  assert.deepEqual(out.event, { at: NOW, actorId: 'staff-arm-2', actorRoleId: 'arm-moderator', action: 'track.approve', entity: { type: 'track', id: 'sub-1', label: 'Песня (демо)' }, fromStatus: 'pending', toStatus: 'approved' });
});

void test('reject and request changes record the trimmed reason in the patch and the event', () => {
  for (const decision of ['reject', 'request-changes'] as const) {
    const out = decide(item(), decision, `  ${REASON}  `, { type: 'release', label: 'EP (демо)' }, 'arm.moderation.decide', moderator);
    assert.ok(out.ok, decision);
    if (!out.ok) continue;
    assert.equal(out.patch.status, DECISION_RESULT[decision]);
    assert.equal(out.patch.reason, REASON);
    assert.equal(out.event.reason, REASON);
    assert.equal(out.event.action, `release.${decision}`);
    assert.equal(out.event.fromStatus, 'pending');
  }
});

void test('reject and request changes without a valid reason are refused', () => {
  for (const decision of ['reject', 'request-changes'] as const) {
    assert.deepEqual(decide(item(), decision, '', { type: 'track', label: 't' }, 'arm.moderation.decide', moderator), { ok: false, error: 'reason-required' });
    assert.deepEqual(decide(item(), decision, 'коротко', { type: 'track', label: 't' }, 'arm.moderation.decide', moderator), { ok: false, error: 'reason-too-short' });
  }
});

void test('only pending items can be decided', () => {
  for (const status of ['approved', 'rejected', 'changes-requested'] as const) {
    for (const decision of REVIEW_DECISIONS) assert.equal(validateReview(status, decision, REASON, 'arm.moderation.decide', moderator), 'not-pending', `${status}/${decision}`);
  }
});

void test('roles without the permission are refused before anything else', () => {
  assert.deepEqual(decide(item(), 'approve', undefined, { type: 'track', label: 't' }, 'arm.moderation.decide', finance), { ok: false, error: 'forbidden' });
  assert.equal(validateReview('approved', 'reject', '', 'arm.moderation.decide', finance), 'forbidden');
  const unknown = { ...moderator, actor: { staffId: 'x', roleId: 'nobody' } };
  assert.equal(validateReview('pending', 'approve', undefined, 'arm.moderation.decide', unknown), 'forbidden');
});

void test('artist verification uses its own permission (moderator may not, super admin may)', () => {
  const admin = { ...moderator, actor: { staffId: 'staff-arm-1', roleId: 'arm-super-admin' } };
  assert.equal(validateReview('pending', 'approve', undefined, 'arm.artists.edit', moderator), 'forbidden');
  assert.equal(validateReview('pending', 'approve', undefined, 'arm.artists.edit', admin), null);
});

void test('audit events omit empty optional fields', () => {
  const event = auditEvent({ action: 'user.reactivate', entity: { type: 'user', id: 'u1', label: 'U' }, fromStatus: 'suspended', toStatus: 'active', reason: '   ' }, moderator);
  assert.equal('reason' in event, false);
  assert.equal(event.actorRoleId, 'arm-moderator');
  assert.equal(event.at, NOW);
});
