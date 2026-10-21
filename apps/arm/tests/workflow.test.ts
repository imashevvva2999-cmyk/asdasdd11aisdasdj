import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMockDataSource } from '@mmusic/backoffice/data';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { buildMatrix, DEFAULT_ROLES } from '@mmusic/backoffice/rbac';
import { createSafeStorage, type StorageBackend } from '@mmusic/backoffice/storage';

import { armSeed } from '../src/domain/seed.ts';
import type { ArmCollections, Submission } from '../src/domain/types.ts';
import { changeUserStatus, countByStatus, decideSubmission, reviewArtist, sortQueue } from '../src/domain/workflow.ts';

const matrix = buildMatrix(DEFAULT_ROLES);
const NOW = '2026-10-21T12:00:00.000Z';
const as = (roleId: string) => ({ matrix, actor: { staffId: DEMO_STAFF.find((s) => s.roleId === roleId)?.id ?? 'x', roleId }, now: NOW });
const REASON = 'Нет прав на семпл в припеве трека';

function memoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

void test('seed: fictional, labelled, consistent', () => {
  const seed = armSeed();
  assert.ok(seed.artists.every((a) => a.name.endsWith('(демо)')));
  assert.ok(seed.users.every((u) => u.email.endsWith('@example.kg')));
  assert.ok([...seed.submissions, ...seed.artists, ...seed.users, ...seed.activity].every((r) => r.mock === true));
  const fictional = seed.submissions.filter((s) => !s.catalogTrackId);
  assert.ok(fictional.every((s) => seed.artists.some((a) => a.id === s.artistId)), 'every fictional submission belongs to a demo artist');
  // Exactly one demo submission is built on a catalog track; it is pending and has no seeded decision.
  const fromCatalog = seed.submissions.filter((s) => s.catalogTrackId);
  assert.deepEqual(fromCatalog.map((s) => [s.id, s.catalogTrackId, s.status]), [['sub-demo-horizon', 'horizon', 'pending']]);
  assert.ok(!seed.artists.some((a) => a.id === fromCatalog[0]!.artistId), 'no demo artist record is created for the catalog artist');
  const decided = [...seed.submissions, ...seed.artists].filter((x) => x.status !== 'pending');
  for (const item of decided) {
    assert.ok(seed.activity.some((e) => e.entity.id === item.id && e.toStatus === item.status), `audit event for ${item.id}`);
    if (item.status !== 'approved') assert.ok((item.reason ?? '').length >= 10, `reason for ${item.id}`);
  }
  assert.ok(seed.users.filter((u) => u.role === 'staff').every((u) => DEMO_STAFF.some((s) => s.id === u.staffId)));
});

void test('moderator approves a pending track; finance cannot', () => {
  const sub = armSeed().submissions.find((s) => s.id === 'sub-t1')!;
  const ok = decideSubmission(sub, 'approve', undefined, as('arm-moderator'));
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.patch.status, 'approved');
    assert.equal(ok.event.action, 'track.approve');
    assert.equal(ok.event.actorRoleId, 'arm-moderator');
    assert.equal(ok.event.actorId, 'staff-arm-2');
  }
  assert.deepEqual(decideSubmission(sub, 'approve', undefined, as('arm-finance')), { ok: false, error: 'forbidden' });
  assert.deepEqual(decideSubmission(sub, 'approve', undefined, as('arm-analyst')), { ok: false, error: 'forbidden' });
});

void test('release rejection and change requests need a reason and log it', () => {
  const sub = armSeed().submissions.find((s) => s.id === 'sub-r1')!;
  assert.deepEqual(decideSubmission(sub, 'reject', '', as('arm-super-admin')), { ok: false, error: 'reason-required' });
  assert.deepEqual(decideSubmission(sub, 'request-changes', 'мало', as('arm-moderator')), { ok: false, error: 'reason-too-short' });
  const out = decideSubmission(sub, 'request-changes', REASON, as('arm-moderator'));
  assert.ok(out.ok);
  if (out.ok) {
    assert.equal(out.event.action, 'release.request-changes');
    assert.equal(out.event.reason, REASON);
    assert.equal(out.event.fromStatus, 'pending');
    assert.equal(out.event.toStatus, 'changes-requested');
  }
});

void test('decided submissions cannot be decided again', () => {
  const approved = armSeed().submissions.find((s) => s.status === 'approved')!;
  assert.deepEqual(decideSubmission(approved, 'reject', REASON, as('arm-moderator')), { ok: false, error: 'not-pending' });
});

void test('artist verification: super admin only (provisional matrix); support and moderator refused', () => {
  const artist = armSeed().artists.find((a) => a.status === 'pending')!;
  assert.ok(reviewArtist(artist, 'approve', undefined, as('arm-super-admin')).ok);
  assert.deepEqual(reviewArtist(artist, 'approve', undefined, as('arm-moderator')), { ok: false, error: 'forbidden' });
  assert.deepEqual(reviewArtist(artist, 'reject', REASON, as('arm-support')), { ok: false, error: 'forbidden' });
  const out = reviewArtist(artist, 'reject', REASON, as('arm-super-admin'));
  assert.ok(out.ok && out.event.action === 'artist.reject' && out.event.entity.label === artist.name);
});

void test('user status: support suspends with a reason, reactivates without; staff accounts and same status refused', () => {
  const users = armSeed().users;
  const listener = users.find((u) => u.id === 'u-6')!;
  assert.deepEqual(changeUserStatus(listener, 'suspended', '', as('arm-support')), { ok: false, error: 'reason-required' });
  const suspended = changeUserStatus(listener, 'suspended', 'Подозрение на взлом аккаунта', as('arm-support'));
  assert.ok(suspended.ok);
  if (suspended.ok) {
    assert.equal(suspended.event.action, 'user.suspend');
    assert.equal(suspended.event.actorRoleId, 'arm-support');
  }
  const blocked = users.find((u) => u.status === 'suspended')!;
  assert.ok(changeUserStatus(blocked, 'active', undefined, as('arm-support')).ok);
  assert.deepEqual(changeUserStatus(listener, 'active', undefined, as('arm-support')), { ok: false, error: 'same-status' });
  assert.deepEqual(changeUserStatus(users.find((u) => u.role === 'staff')!, 'suspended', REASON, as('arm-super-admin')), { ok: false, error: 'staff-account' });
  assert.deepEqual(changeUserStatus(listener, 'suspended', REASON, as('arm-moderator')), { ok: false, error: 'forbidden' });
});

void test('queue helpers: counts per status; pending first, newest first', () => {
  const subs = armSeed().submissions.filter((s) => s.kind === 'track');
  const counts = countByStatus(subs);
  assert.equal(counts.pending + counts.approved + counts.rejected + counts['changes-requested'], subs.length);
  const sorted = sortQueue(subs);
  const firstDecided = sorted.findIndex((s) => s.status !== 'pending');
  assert.ok(sorted.slice(firstDecided).every((s) => s.status !== 'pending'));
  assert.ok(sorted.slice(0, firstDecided).every((s, i, arr) => i === 0 || arr[i - 1]!.submittedAt >= s.submittedAt));
});

void test('decision + audit event persist through the mock repositories and survive a reload', async () => {
  const backend = memoryBackend();
  const open = () => createMockDataSource<ArmCollections>({ namespace: 'mmusic-arm', version: 2, seed: armSeed, storage: createSafeStorage(backend) });
  const ds = open();
  const sub = (await ds.repository('submissions').get('sub-t2')) as Submission;
  const out = decideSubmission(sub, 'reject', REASON, as('arm-moderator'));
  assert.ok(out.ok);
  if (!out.ok) return;
  await ds.repository('submissions').update(sub.id, out.patch);
  await ds.repository('activity').create(out.event);
  const reloaded = open();
  const after = (await reloaded.repository('submissions').get('sub-t2')) as Submission;
  assert.equal(after.status, 'rejected');
  assert.equal(after.reason, REASON);
  const events = await reloaded.repository('activity').list();
  assert.ok(events.some((e) => e.entity.id === 'sub-t2' && e.action === 'track.reject' && e.reason === REASON && e.mock === true));
  reloaded.reset();
  assert.equal(((await reloaded.repository('submissions').get('sub-t2')) as Submission).status, 'pending');
});

void test('playable demo submission: approve, reject and request changes each log an audit event; reset restores it', async () => {
  const backend = memoryBackend();
  const open = () => createMockDataSource<ArmCollections>({ namespace: 'mmusic-arm', version: 3, seed: armSeed, storage: createSafeStorage(backend) });
  const ds = open();
  for (const [decision, reason, status] of [['approve', undefined, 'approved'], ['reject', REASON, 'rejected'], ['request-changes', REASON, 'changes-requested']] as const) {
    ds.reset();
    const sub = (await ds.repository('submissions').get('sub-demo-horizon')) as Submission;
    assert.equal(sub.status, 'pending');
    const out = decideSubmission(sub, decision, reason, as('arm-moderator'));
    assert.ok(out.ok, decision);
    if (!out.ok) return;
    await ds.repository('submissions').update(sub.id, out.patch);
    await ds.repository('activity').create(out.event);
    const reloaded = open();
    assert.equal(((await reloaded.repository('submissions').get(sub.id)) as Submission).status, status);
    const events = (await reloaded.repository('activity').list()).filter((e) => e.entity.id === sub.id);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.action, `track.${decision}`);
    assert.equal(events[0]!.entity.label, 'Horizon');
    assert.equal(events[0]!.toStatus, status);
  }
  // Deleting it and resetting the demo data brings it back, pending and without history.
  await ds.repository('submissions').remove('sub-demo-horizon');
  assert.equal(await ds.repository('submissions').get('sub-demo-horizon'), undefined);
  ds.reset();
  const restored = (await open().repository('submissions').get('sub-demo-horizon')) as Submission;
  assert.equal(restored.status, 'pending');
  assert.equal(restored.catalogTrackId, 'horizon');
  assert.ok(!(await open().repository('activity').list()).some((e) => e.entity.id === 'sub-demo-horizon'));
});

void test('saved data of the previous version (without the demo submission) is re-seeded', async () => {
  const backend = memoryBackend();
  const v2 = createMockDataSource<ArmCollections>({ namespace: 'mmusic-arm', version: 2, seed: () => ({ ...armSeed(), submissions: armSeed().submissions.filter((s) => s.id !== 'sub-demo-horizon') }), storage: createSafeStorage(backend) });
  await v2.repository('submissions').list();
  const v3 = createMockDataSource<ArmCollections>({ namespace: 'mmusic-arm', version: 3, seed: armSeed, storage: createSafeStorage(backend) });
  assert.ok(await v3.repository('submissions').get('sub-demo-horizon'));
});
