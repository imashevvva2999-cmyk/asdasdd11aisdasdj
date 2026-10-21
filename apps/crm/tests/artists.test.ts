import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMockDataSource } from '@mmusic/backoffice/data';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { createSafeStorage, type StorageBackend } from '@mmusic/backoffice/storage';

import { addMember, artistInput, changeCollaboration, changeMemberRole, createArtist, crmOrgKind, groupsOf, removeMember, updateArtist, type ArtistInput } from '../src/domain/artists.ts';
import { CRM_DATA_KEY, CRM_DATA_VERSION, migrateCrmData, migrateStoredCrmData } from '../src/domain/migrate.ts';
import { buildCrmMatrix, crmCan, defaultRoleConfigs, type CrmContext } from '../src/domain/permissions.ts';
import { createDeal, dealInput, updateDeal } from '../src/domain/pipeline.ts';
import { logInteraction, organizationInput, updateOrganization } from '../src/domain/rules.ts';
import { crmSeed } from '../src/domain/seed.ts';
import { openStages } from '../src/domain/settings.ts';
import { createTask, taskInput } from '../src/domain/tasks.ts';
import { CRM_ORG_KINDS, type CrmCollections, type RoleConfig } from '../src/domain/types.ts';

const NOW = '2026-10-21T12:00:00.000Z';
const matrix = buildCrmMatrix(defaultRoleConfigs());
const staffOf = (roleId: string) => DEMO_STAFF.find((s) => s.roleId === roleId)?.id ?? 'x';
const as = (roleId: string): CrmContext => ({ matrix, actor: { staffId: staffOf(roleId), roleId }, now: NOW });
const lead = as('crm-partnership-lead');
const seed = crmSeed();
const group = (id: string) => seed.organizations.find((o) => o.id === id)!;
const STAFF = DEMO_STAFF.filter((s) => s.app === 'crm').map((s) => s.id);
const input = (over: Partial<ArtistInput> = {}): ArtistInput => ({ ...artistInput(), stageName: 'Тестовый Голос (демо)', genres: 'Pop, pop, Jazz', city: 'Бишкек', ...over });

function memoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

void test('seed: fictional artists and groups, one record per person, consistent links', () => {
  assert.ok(seed.artists.every((a) => a.mock && a.stageName.endsWith('(демо)') && !a.legalName), 'fictional, no legal names');
  assert.equal(new Set(seed.artists.map((a) => a.stageName.toLocaleLowerCase())).size, seed.artists.length, 'no duplicate artists');
  assert.ok(seed.organizations.every((o) => CRM_ORG_KINDS.includes(o.kind)), 'unified organization types only');
  for (const g of seed.organizations.filter((o) => o.kind === 'group')) {
    assert.ok(g.members?.every((m) => seed.artists.some((a) => a.id === m.artistId) && m.role), g.id);
    assert.equal(new Set(g.members?.map((m) => m.artistId)).size, g.members?.length, `${g.id}: no member twice`);
  }
  assert.deepEqual(groupsOf('artist-4', seed.organizations).map((g) => g.id), ['group-1', 'group-2'], 'one artist record in two groups');
  assert.ok(seed.organizations.filter((o) => o.kind !== 'group').every((o) => !o.members?.length));
  for (const a of seed.artists) if (a.managerContactId) assert.ok(seed.contacts.some((c) => c.id === a.managerContactId), a.id);
  for (const r of [...seed.deals, ...seed.tasks, ...seed.interactions]) if (r.artistId) assert.ok(seed.artists.some((a) => a.id === r.artistId), r.id);
});

void test('organization types: legacy types map onto the unified set; groups keep members', () => {
  assert.deepEqual(['label', 'venue', 'sponsor', 'media', 'agency', 'bank-unit', 'group', '???'].map((k) => crmOrgKind(k)), ['label', 'event-organizer', 'company', 'media', 'agency', 'company', 'group', 'other']);
  // A sponsor becomes an event organizer only when its record describes a festival.
  assert.equal(crmOrgKind('sponsor', { name: 'Фестиваль «Иссык-Куль Саунд» (демо)', tags: ['фестиваль'] }), 'event-organizer');
  assert.equal(crmOrgKind('sponsor', { name: 'Кофейня «Бариста» (демо)', about: 'Спонсор городских концертов' }), 'company');
  // Pre-approval preview data stored media and festivals as companies: restored from the record.
  assert.equal(crmOrgKind('company', { name: 'Подкаст «Ритм города» (демо)', tags: ['медиа'] }), 'media');
  assert.equal(crmOrgKind('company', { name: 'Отдел партнёрских программ банка (демо)', tags: ['банк'] }), 'company');
  const festival = seed.organizations.find((o) => o.id === 'org-5')!;
  assert.deepEqual([festival.kind, festival.formerKind], ['event-organizer', 'sponsor'], 'seed festival: event organizer, former type kept');
  assert.deepEqual(['org-3', 'org-7'].map((id) => seed.organizations.find((o) => o.id === id)?.kind), ['media', 'media']);
  assert.deepEqual([group('org-6').kind, group('org-6').formerKind], ['company', 'bank-unit']);
  const g = group('group-1');
  const out = updateOrganization(g, { ...organizationInput(g), kind: 'company' }, lead);
  assert.deepEqual(out, { ok: false, error: 'invalid', fields: { kind: 'has-members' } });
  assert.ok(updateOrganization(g, { ...organizationInput(g), city: 'Ош' }, lead).ok);
});

void test('artists: permission, validation, no duplicates, audit', () => {
  assert.equal(crmCan(matrix, 'crm-viewer', 'crm.artists.view'), true);
  assert.equal(crmCan(matrix, 'crm-viewer', 'crm.artists.edit'), false);
  assert.equal(crmCan(matrix, 'crm-manager', 'crm.artists.edit'), true);
  assert.deepEqual(createArtist(input(), seed.artists, seed.contacts, as('crm-viewer')), { ok: false, error: 'forbidden' });
  const bad = createArtist(input({ stageName: '  ай-нур   (ДЕМО) ', genres: '', city: '', email: 'x@gmail.com', phone: '123', managerContactId: 'nope', avatar: 'data:text/html;base64,AAAA' }), seed.artists, seed.contacts, lead);
  assert.deepEqual(bad, { ok: false, error: 'invalid', fields: { stageName: 'duplicate', genres: 'required', city: 'required', email: 'email-not-demo', phone: 'phone-not-demo', managerContactId: 'unknown-contact', avatar: 'image-invalid' } });
  const ok = createArtist(input({ avatar: 'data:image/jpeg;base64,/9j/AAAA', managerContactId: 'contact-7' }), seed.artists, seed.contacts, lead);
  assert.ok(ok.ok);
  if (!ok.ok) return;
  assert.deepEqual(ok.record.genres, ['Pop', 'Jazz'], 'genres de-duplicated');
  assert.equal(ok.record.collaboration, 'prospect');
  assert.equal(ok.record.legalName, undefined, 'legal name optional');
  assert.equal(ok.audit('artists-x').action, 'artist.create');
  const self = seed.artists[0]!;
  assert.ok(updateArtist(self, artistInput(self), seed.artists, seed.contacts, as('crm-manager')).ok, 'own name is not a duplicate');
  assert.deepEqual(updateArtist(self, { ...artistInput(self), stageName: seed.artists[1]!.stageName }, seed.artists, seed.contacts, lead), { ok: false, error: 'invalid', fields: { stageName: 'duplicate' } });
  assert.deepEqual(changeCollaboration(self, 'active', '', as('crm-viewer')), { ok: false, error: 'forbidden' });
  const moved = changeCollaboration(self, 'active', 'Договорились о подборке', as('crm-manager'));
  assert.ok(moved.ok && moved.event.fromStatus === 'negotiating' && moved.event.toStatus === 'active' && moved.event.action === 'artist.collaboration');
});

void test('group members: references to artists, roles, guards, audit', () => {
  const g = group('group-1');
  assert.deepEqual(addMember(g, 'artist-1', 'Бэк-вокал', seed.artists, as('crm-viewer')), { ok: false, error: 'forbidden' });
  assert.deepEqual(addMember(group('org-1'), 'artist-1', 'Вокал', seed.artists, lead), { ok: false, error: 'not-group' });
  assert.deepEqual(addMember(g, 'artist-3', 'Вокал', seed.artists, lead), { ok: false, error: 'invalid', fields: { artistId: 'duplicate' } });
  assert.deepEqual(addMember(g, 'nope', '', seed.artists, lead), { ok: false, error: 'invalid', fields: { artistId: 'unknown-artist', role: 'required' } });
  const added = addMember(g, 'artist-1', ' Бэк-вокал ', seed.artists, as('crm-manager'));
  assert.ok(added.ok && added.patch.members?.length === 4 && added.patch.members.at(-1)?.role === 'Бэк-вокал' && added.event.action === 'organization.member-add');
  const role = changeMemberRole(g, 'artist-4', 'Бас-гитара', seed.artists, lead);
  assert.ok(role.ok && role.patch.members?.find((m) => m.artistId === 'artist-4')?.role === 'Бас-гитара' && role.event.reason === 'Тим Струна (демо): Гитара → Бас-гитара');
  const removed = removeMember(g, 'artist-5', seed.artists, lead);
  assert.ok(removed.ok && !removed.patch.members?.some((m) => m.artistId === 'artist-5') && removed.event.action === 'organization.member-remove');
  assert.deepEqual(removeMember(g, 'artist-1', seed.artists, lead), { ok: false, error: 'not-found' });
});

void test('deals, tasks and interactions link to a solo artist or a group / organization', () => {
  const open = openStages(seed.pipeline).map((s) => s.id);
  const base = { ...dealInput(undefined, 'staff-crm-1'), title: 'Подборка артиста', stage: 'lead' };
  const withArtist = createDeal({ ...base, artistId: 'artist-2', contactId: 'contact-7' }, seed.organizations, seed.contacts, STAFF, open, lead, seed.artists);
  assert.ok(withArtist.ok && withArtist.record.artistId === 'artist-2' && withArtist.record.organizationId === undefined);
  assert.ok(createDeal({ ...base, organizationId: 'group-2' }, seed.organizations, seed.contacts, STAFF, open, lead, seed.artists).ok, 'deal with a music group');
  assert.deepEqual(createDeal({ ...base, organizationId: 'org-1', artistId: 'artist-2' }, seed.organizations, seed.contacts, STAFF, open, lead, seed.artists), { ok: false, error: 'invalid', fields: { organizationId: 'counterparty-required' } });
  assert.deepEqual(createDeal({ ...base, artistId: 'nope' }, seed.organizations, seed.contacts, STAFF, open, lead, seed.artists), { ok: false, error: 'invalid', fields: { artistId: 'unknown-artist' } });

  // Optional secondary participant: an artist or an organization, never the primary again; one deal record.
  const label = createDeal({ ...base, artistId: 'artist-1', secondaryOrganizationId: 'org-1' }, seed.organizations, seed.contacts, STAFF, open, lead, seed.artists);
  assert.ok(label.ok && label.record.artistId === 'artist-1' && label.record.secondaryOrganizationId === 'org-1' && label.record.secondaryArtistId === undefined);
  assert.ok(createDeal({ ...base, organizationId: 'org-1', secondaryArtistId: 'artist-1' }, seed.organizations, seed.contacts, STAFF, open, lead, seed.artists).ok, 'label deal with an artist as secondary');
  assert.deepEqual(createDeal({ ...base, organizationId: 'org-1', secondaryOrganizationId: 'org-1' }, seed.organizations, seed.contacts, STAFF, open, lead, seed.artists), { ok: false, error: 'invalid', fields: { secondaryOrganizationId: 'same-participant' } });
  assert.deepEqual(createDeal({ ...base, artistId: 'artist-1', secondaryArtistId: 'artist-1' }, seed.organizations, seed.contacts, STAFF, open, lead, seed.artists), { ok: false, error: 'invalid', fields: { secondaryArtistId: 'same-participant' } });
  assert.deepEqual(createDeal({ ...base, artistId: 'artist-1', secondaryOrganizationId: 'org-1', secondaryArtistId: 'artist-2' }, seed.organizations, seed.contacts, STAFF, open, lead, seed.artists), { ok: false, error: 'invalid', fields: { secondaryOrganizationId: 'counterparty-required' } });
  assert.deepEqual(createDeal({ ...base, artistId: 'artist-1', secondaryOrganizationId: 'nope' }, seed.organizations, seed.contacts, STAFF, open, lead, seed.artists), { ok: false, error: 'invalid', fields: { secondaryOrganizationId: 'unknown-organization' } });
  assert.deepEqual(createDeal({ ...base, artistId: 'artist-1', secondaryOrganizationId: 'org-1' }, seed.organizations, seed.contacts, STAFF, open, as('crm-viewer'), seed.artists), { ok: false, error: 'forbidden' });
  const edited = updateDeal(seed.deals.find((d) => d.id === 'deal-a1')!, { ...dealInput(seed.deals.find((d) => d.id === 'deal-a1')), secondaryOrganizationId: 'org-1' }, seed.organizations, seed.contacts, STAFF, lead, seed.artists);
  assert.ok(edited.ok && edited.patch.secondaryOrganizationId === 'org-1' && edited.patch.stage === undefined && edited.event.action === 'deal.update', 'adding a participant keeps the stage, writes an audit event');
  const dropped = updateDeal({ ...seed.deals.find((d) => d.id === 'deal-a1')!, secondaryOrganizationId: 'org-1' }, dealInput(seed.deals.find((d) => d.id === 'deal-a1')), seed.organizations, seed.contacts, STAFF, lead, seed.artists);
  assert.ok(dropped.ok && 'secondaryOrganizationId' in dropped.patch && dropped.patch.secondaryOrganizationId === undefined, 'the participant can be removed again');

  const links = { contacts: seed.contacts, organizations: seed.organizations, deals: seed.deals, staffIds: STAFF, artists: seed.artists };
  const task = createTask(taskInput(undefined, { title: 'Позвонить менеджеру', assigneeId: 'staff-crm-2', dealId: 'deal-a1' }), links, lead);
  assert.ok(task.ok && task.record.artistId === 'artist-1', 'the artist follows the deal');
  assert.deepEqual(createTask(taskInput(undefined, { title: 'X', assigneeId: 'staff-crm-2', dealId: 'deal-a1', artistId: 'artist-2' }), links, lead), { ok: false, error: 'invalid', fields: { dealId: 'deal-not-in-org' } });

  const note = { kind: 'note' as const, at: '2026-10-20T10:00', summary: 'Заметка об артисте', contactId: '', organizationId: '', followUpAt: '' };
  const logged = logInteraction({ ...note, artistId: 'artist-6' }, seed.contacts, seed.organizations, lead, seed.artists);
  assert.ok(logged.ok && logged.record.artistId === 'artist-6');
  assert.deepEqual(logInteraction(note, seed.contacts, seed.organizations, lead, seed.artists), { ok: false, error: 'invalid', fields: { contactId: 'target-required' } });
  assert.deepEqual(logInteraction({ ...note, artistId: 'nope' }, seed.contacts, seed.organizations, lead, seed.artists), { ok: false, error: 'invalid', fields: { artistId: 'unknown-artist' } });
});

void test('migration v4 → v5 keeps every saved record and local edit, maps types, adds artists and rights', async () => {
  const unifiedIds = new Set(['group-1', 'group-2', 'contact-9', 'deal-a1', 'deal-a2', 'task-a1', 'task-a2', 'int-a1', 'int-a2', 'int-a3']);
  const legacyKinds: Record<string, string> = { 'org-1': 'label', 'org-2': 'venue', 'org-3': 'media', 'org-4': 'agency', 'org-5': 'sponsor', 'org-6': 'bank-unit', 'org-7': 'media' };
  const keep = <T extends { id: string }>(xs: T[]) => xs.filter((x) => !unifiedIds.has(x.id));
  const { artists: _a, ...rest } = crmSeed();
  const plainSponsor = { ...rest.organizations[0]!, members: undefined, formerKind: undefined, id: 'organizations-mmusic-crm-60', name: 'Кофейня «Бариста» (демо)', kind: 'sponsor', about: 'Спонсор городских концертов (вымышленный).', tags: [] };
  const savedRoles = rest.roles.map((r) => ({ ...r, permissions: r.permissions.filter((p) => !p.startsWith('crm.artists.')) }));
  // A local M6 matrix edit: the manager lost tasks editing; it must survive the upgrade.
  const managerEdited = savedRoles.map((r) => (r.id === 'crm-manager' ? { ...r, permissions: r.permissions.filter((p) => p !== 'crm.tasks.edit') } : r));
  const saved = {
    version: 4,
    nextId: 77,
    data: {
      ...rest,
      organizations: [...keep(rest.organizations).map((o) => ({ ...o, kind: legacyKinds[o.id] ?? o.kind, members: undefined, formerKind: undefined })), plainSponsor],
      contacts: [...keep(rest.contacts), { ...rest.contacts[0]!, id: 'contacts-mmusic-crm-70', name: 'Локальный контакт', organizationId: 'org-2' }],
      deals: keep(rest.deals),
      tasks: keep(rest.tasks),
      interactions: keep(rest.interactions),
      roles: managerEdited,
    },
  };
  const next = migrateCrmData(saved)!;
  assert.equal(next.version, CRM_DATA_VERSION);
  assert.equal(next.nextId, 77);
  const orgs = next.data.organizations as CrmCollections['organizations'];
  assert.equal(orgs.find((o) => o.id === 'org-2')?.kind, 'event-organizer');
  assert.deepEqual([orgs.find((o) => o.id === 'org-6')?.kind, orgs.find((o) => o.id === 'org-6')?.formerKind], ['company', 'bank-unit']);
  assert.deepEqual([orgs.find((o) => o.id === 'org-5')?.kind, orgs.find((o) => o.id === 'org-5')?.formerKind], ['event-organizer', 'sponsor'], 'festival sponsor → event organizer');
  assert.deepEqual(['org-3', 'org-7'].map((id) => orgs.find((o) => o.id === id)?.kind), ['media', 'media'], 'media stays media');
  assert.equal(orgs.find((o) => o.id === 'org-2')?.formerKind, 'venue');
  assert.deepEqual([orgs.find((o) => o.id === plainSponsor.id)?.kind, orgs.find((o) => o.id === plainSponsor.id)?.formerKind], ['company', 'sponsor'], 'a plain sponsor is not turned into an event organizer');
  assert.ok(orgs.some((o) => o.id === 'group-1' && o.members?.length === 3), 'demo groups added');
  assert.ok((next.data.contacts as { id: string }[]).some((c) => c.id === 'contacts-mmusic-crm-70'), 'local contact kept');
  assert.equal((next.data.artists as unknown[]).length, 6);
  for (const name of ['deals', 'tasks', 'interactions'] as const) assert.equal((next.data[name] as unknown[]).length, rest[name].length, `${name}: saved + demo, no duplicates`);
  const roles = next.data.roles as RoleConfig[];
  const manager = roles.find((r) => r.id === 'crm-manager')!.permissions;
  assert.ok(manager.includes('crm.artists.edit') && !manager.includes('crm.tasks.edit'), 'artist rights added, local edit kept');
  assert.deepEqual(roles.find((r) => r.id === 'crm-viewer')!.permissions.filter((p) => p.startsWith('crm.artists.')), ['crm.artists.view']);
  assert.equal(migrateCrmData(next), undefined, 'current data untouched');
  // The pre-approval preview (v5) stored media and the festival as companies: v5 → v6 restores them, keeps the rest.
  const preview = { version: 5, nextId: 80, data: { ...next.data, organizations: orgs.map((o) => (o.kind === 'media' || o.id === 'org-5' ? { ...o, kind: 'company', formerKind: undefined } : o)) } };
  const fixed = migrateCrmData(preview)!;
  const fixedOrgs = fixed.data.organizations as CrmCollections['organizations'];
  assert.equal(fixed.version, CRM_DATA_VERSION);
  assert.deepEqual(['org-3', 'org-5', 'org-7', 'org-6'].map((id) => fixedOrgs.find((o) => o.id === id)?.kind), ['media', 'event-organizer', 'media', 'company']);
  assert.equal(fixedOrgs.length, orgs.length, 'nothing added or lost');

  const storage = createSafeStorage(memoryBackend());
  storage.setJSON(CRM_DATA_KEY, saved);
  assert.ok(migrateStoredCrmData(storage));
  assert.equal(migrateStoredCrmData(storage), false, 'idempotent');
  const ds = createMockDataSource<CrmCollections>({ namespace: 'mmusic-crm', version: CRM_DATA_VERSION, seed: crmSeed, storage });
  assert.equal((await ds.repository('contacts').get('contacts-mmusic-crm-70'))?.name, 'Локальный контакт');
  assert.equal((await ds.repository('artists').list()).length, 6);
  ds.reset();
  assert.equal(await ds.repository('contacts').get('contacts-mmusic-crm-70'), undefined, 'reset restores the demo set');
});
