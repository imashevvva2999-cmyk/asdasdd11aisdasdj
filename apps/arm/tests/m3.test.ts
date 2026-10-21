import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { createMockDataSource } from '@mmusic/backoffice/data';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { buildMatrix, DEFAULT_ROLES } from '@mmusic/backoffice/rbac';
import { createSafeStorage, type StorageBackend } from '@mmusic/backoffice/storage';

import { activityReport, campaignReport, median, moderationReport, paymentsByArtist, paymentsByStatus, toCsv } from '../src/domain/reports.ts';
import { armSeed } from '../src/domain/seed.ts';
import type { ArmCollections, Campaign, Submission } from '../src/domain/types.ts';
import { changeListing, decideCampaign, isListed } from '../src/domain/workflow.ts';

const matrix = buildMatrix(DEFAULT_ROLES);
const NOW = '2026-10-21T12:00:00.000Z';
const as = (roleId: string) => ({ matrix, actor: { staffId: DEMO_STAFF.find((s) => s.roleId === roleId)?.id ?? 'x', roleId }, now: NOW });
const REASON = 'Нет согласования правообладателя на промо';
const seed = armSeed();
const sub = (id: string) => seed.submissions.find((s) => s.id === id)!;
const camp = (id: string) => seed.campaigns.find((c) => c.id === id)!;

function memoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

void test('M3 seed: campaigns and donations involve only fictional demo artists and demo users', () => {
  const demoArtists = new Set(seed.artists.map((a) => a.id));
  const listeners = new Set(seed.users.filter((u) => u.role === 'listener').map((u) => u.id));
  const catalogArtistIds = [...readFileSync(new URL('../../../core/mocks/artists.ts', import.meta.url), 'utf8').matchAll(/\bid: '([^']+)'/g)].map((m) => m[1]);
  for (const c of seed.campaigns) {
    assert.ok(c.mock && demoArtists.has(c.artistId), c.id);
    assert.equal(sub(c.submissionId).artistId, c.artistId, `${c.id} promotes the artist's own submission`);
    assert.ok(!('reach' in c) && !('streams' in c) && !('impressions' in c), 'no performance figures');
  }
  for (const x of seed.transactions) {
    assert.ok(x.mock && x.kind === 'donation' && demoArtists.has(x.recipientArtistId) && listeners.has(x.payerUserId), x.id);
    assert.ok(!catalogArtistIds.includes(x.recipientArtistId), 'never a catalog artist');
    assert.ok(Number.isInteger(x.amountKgs) && x.amountKgs > 0);
    assert.match(x.reference, /^DEMO-TX-\d+$/);
    assert.match(x.accountMask, /^•••• \d{4}$/);
    assert.equal(x.status === 'failed', !!x.failureReason, `${x.id}: failure reason only for failed`);
  }
  assert.equal(new Set(seed.transactions.map((x) => x.reference)).size, seed.transactions.length);
  for (const c of seed.campaigns.filter((x) => x.status !== 'pending')) {
    assert.ok(seed.activity.some((e) => e.entity.type === 'campaign' && e.entity.id === c.id && e.toStatus === c.status), `audit event for ${c.id}`);
  }
});

void test('campaign review: super admin only; approve needs an approved, listed item; reasons for reject / changes', () => {
  const ready = camp('camp-1');
  assert.ok(isListed(sub(ready.submissionId)));
  const ok = decideCampaign(ready, sub(ready.submissionId), 'approve', undefined, as('arm-super-admin'));
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.event.action, 'campaign.approve');
    assert.equal(ok.event.entity.label, 'Кара-Суу');
    assert.equal(ok.event.toStatus, 'approved');
  }
  for (const role of ['arm-finance', 'arm-moderator', 'arm-analyst', 'arm-support']) assert.deepEqual(decideCampaign(ready, sub(ready.submissionId), 'approve', undefined, as(role)), { ok: false, error: 'forbidden' }, role);
  const notReady = camp('camp-3');
  assert.equal(sub(notReady.submissionId).status, 'pending');
  assert.deepEqual(decideCampaign(notReady, sub(notReady.submissionId), 'approve', undefined, as('arm-super-admin')), { ok: false, error: 'item-not-ready' });
  assert.deepEqual(decideCampaign(notReady, sub(notReady.submissionId), 'reject', '', as('arm-super-admin')), { ok: false, error: 'reason-required' });
  const changes = decideCampaign(notReady, sub(notReady.submissionId), 'request-changes', REASON, as('arm-super-admin'));
  assert.ok(changes.ok && changes.event.reason === REASON && changes.event.toStatus === 'changes-requested');
  assert.deepEqual(decideCampaign(camp('camp-7'), sub('sub-t4'), 'reject', REASON, as('arm-super-admin')), { ok: false, error: 'not-pending' });
});

void test('catalog listing: moderator unlists with a reason and lists again; approval of its campaign is then blocked', () => {
  const item = sub('sub-t4');
  assert.deepEqual(changeListing(item, 'unlisted', '', as('arm-moderator')), { ok: false, error: 'reason-required' });
  assert.deepEqual(changeListing(item, 'unlisted', REASON, as('arm-finance')), { ok: false, error: 'forbidden' });
  assert.deepEqual(changeListing(item, 'unlisted', REASON, as('arm-analyst')), { ok: false, error: 'forbidden' });
  assert.deepEqual(changeListing(item, 'listed', undefined, as('arm-moderator')), { ok: false, error: 'same-status' });
  assert.deepEqual(changeListing(sub('sub-t1'), 'unlisted', REASON, as('arm-moderator')), { ok: false, error: 'not-approved' });
  const out = changeListing(item, 'unlisted', REASON, as('arm-moderator'));
  assert.ok(out.ok);
  if (!out.ok) return;
  assert.equal(out.event.action, 'track.unlist');
  assert.equal(out.event.fromStatus, 'listed');
  assert.equal(out.event.toStatus, 'unlisted');
  const unlisted: Submission = { ...item, ...out.patch };
  assert.ok(!isListed(unlisted));
  assert.deepEqual(decideCampaign(camp('camp-1'), unlisted, 'approve', undefined, as('arm-super-admin')), { ok: false, error: 'item-not-ready' });
  const back = changeListing(unlisted, 'listed', undefined, as('arm-moderator'));
  assert.ok(back.ok && back.event.action === 'track.relist' && back.patch.listing === 'listed');
});

void test('reports aggregate only the demo data', () => {
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  const tracks = moderationReport(seed.submissions).find((r) => r.kind === 'track')!;
  assert.equal(tracks.total, seed.submissions.filter((s) => s.kind === 'track').length);
  assert.equal(tracks.counts.pending + tracks.counts.approved + tracks.counts.rejected + tracks.counts['changes-requested'], tracks.total);
  assert.ok(tracks.medianDecisionHours !== null && tracks.medianDecisionHours > 0);
  const byStatus = paymentsByStatus(seed.transactions);
  assert.equal(byStatus.reduce((s, r) => s + r.count, 0), seed.transactions.length);
  assert.equal(byStatus.find((r) => r.status === 'completed')!.amountKgs, seed.transactions.filter((x) => x.status === 'completed').reduce((s, x) => s + x.amountKgs, 0));
  const byArtist = paymentsByArtist(seed.transactions);
  assert.ok(byArtist.every((r, i, arr) => i === 0 || arr[i - 1]!.completedKgs >= r.completedKgs));
  assert.equal(byArtist.find((r) => r.artistId === 'dart-3')!.supporters, 3);
  const camps = campaignReport(seed.campaigns);
  assert.equal(camps.reduce((s, r) => s + r.total, 0), seed.campaigns.length);
  assert.equal(camps.find((r) => r.toolId === 'editorial-pitch')!.requestedBudgetKgs, 0);
  assert.equal(activityReport(seed.activity).reduce((s, r) => s + r.total, 0), seed.activity.length);
});

void test('CSV export: BOM, quoting, CRLF', () => {
  const csv = toCsv(['Название', 'Сумма'], [['Кара-Суу, сингл', 100], ['Say "hi"', 5]]);
  assert.ok(csv.startsWith('﻿Название,Сумма\r\n'));
  assert.ok(csv.includes('"Кара-Суу, сингл",100\r\n'));
  assert.ok(csv.includes('"Say ""hi""",5\r\n'));
});

void test('campaign decision persists with its audit event; reset restores the seed (data version 4)', async () => {
  const backend = memoryBackend();
  const open = () => createMockDataSource<ArmCollections>({ namespace: 'mmusic-arm', version: 4, seed: armSeed, storage: createSafeStorage(backend) });
  const ds = open();
  const c = (await ds.repository('campaigns').get('camp-2')) as Campaign;
  const out = decideCampaign(c, (await ds.repository('submissions').get(c.submissionId)) as Submission, 'approve', undefined, as('arm-super-admin'));
  assert.ok(out.ok);
  if (!out.ok) return;
  await ds.repository('campaigns').update(c.id, out.patch);
  await ds.repository('activity').create(out.event);
  const reloaded = open();
  assert.equal(((await reloaded.repository('campaigns').get('camp-2')) as Campaign).status, 'approved');
  assert.ok((await reloaded.repository('activity').list()).some((e) => e.action === 'campaign.approve' && e.entity.id === 'camp-2' && e.mock === true));
  reloaded.reset();
  assert.equal(((await open().repository('campaigns').get('camp-2')) as Campaign).status, 'pending');
  assert.equal((await open().repository('transactions').list()).length, seed.transactions.length);
});
