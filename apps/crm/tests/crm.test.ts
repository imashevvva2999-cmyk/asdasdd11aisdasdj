import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMockDataSource } from '@mmusic/backoffice/data';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { createSafeStorage, type StorageBackend } from '@mmusic/backoffice/storage';

import {
  changeRelationship,
  completeFollowUp,
  contactInput,
  createContact,
  createOrganization,
  crmSummary,
  DEMO_EMAIL,
  DEMO_PHONE,
  linkContact,
  logInteraction,
  openFollowUps,
  updateContact,
  validateContact,
  type ContactInput,
  type InteractionInput,
} from '../src/domain/rules.ts';
import { buildCrmMatrix, defaultRoleConfigs } from '../src/domain/permissions.ts';
import { crmSeed } from '../src/domain/seed.ts';
import { RELATIONSHIP_STATUSES, type CrmCollections, type CrmContact } from '../src/domain/types.ts';

const matrix = buildCrmMatrix(defaultRoleConfigs());
const NOW = '2026-10-21T12:00:00.000Z';
const as = (roleId: string) => ({ matrix, actor: { staffId: DEMO_STAFF.find((s) => s.roleId === roleId)?.id ?? 'x', roleId }, now: NOW });
const seed = crmSeed();
const contact = (id: string) => seed.contacts.find((c) => c.id === id)!;
const org = (id: string) => seed.organizations.find((o) => o.id === id)!;
const NEW: ContactInput = { name: 'Тест Демо', positionRu: 'Менеджер', positionEn: '', organizationId: 'org-1', email: 'Test@Example.kg', phone: '+996 555 000 099', tags: 'Лейбл, демо, лейбл', status: 'active' };
const LOG: InteractionInput = { kind: 'call', at: '2026-10-21T10:00', summary: 'Созвон по демо-проекту', contactId: 'contact-2', organizationId: '', followUpAt: '' };

function memoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

void test('seed: fictional, labelled and consistent', () => {
  const all = [...seed.contacts, ...seed.organizations, ...seed.interactions];
  assert.ok(all.every((r) => r.mock === true));
  assert.ok(seed.contacts.every((c) => DEMO_EMAIL.test(c.email) && DEMO_PHONE.test(c.phone)), 'example.* e-mails and demo phone numbers');
  assert.ok(seed.organizations.every((o) => o.name.endsWith('(демо)') && RELATIONSHIP_STATUSES.includes(o.relationship)));
  assert.ok(seed.contacts.every((c) => !c.organizationId || seed.organizations.some((o) => o.id === c.organizationId)));
  for (const i of seed.interactions) {
    assert.ok(i.contactId || i.organizationId, i.id);
    if (i.contactId) assert.ok(seed.contacts.some((c) => c.id === i.contactId), i.id);
    if (i.contactId && i.organizationId) assert.equal(contact(i.contactId).organizationId, i.organizationId, `${i.id} organization matches the contact`);
    assert.ok(DEMO_STAFF.some((s) => s.id === i.authorId && s.app === 'crm'));
    assert.ok(!/\d\s?(сом|kgs|\$|usd)|договор подписан|contract signed/i.test(i.summary), `${i.id}: no money or agreements`);
  }
  // The only seeded change-log entries are the M5 deal / task history (tests/m5.test.ts).
  assert.ok(seed.activity.every((e) => e.entity.type === 'deal' || e.entity.type === 'task'));
});

void test('contact validation: required fields, fictional e-mail / phone only, normalized tags and position', () => {
  const v = validateContact(NEW, seed.organizations);
  assert.ok(v.ok);
  if (v.ok) {
    assert.equal(v.value.email, 'test@example.kg');
    assert.deepEqual(v.value.tags, ['лейбл', 'демо']);
    assert.deepEqual(v.value.position, { ru: 'Менеджер', en: 'Менеджер' });
  }
  const bad = validateContact({ ...NEW, name: ' ', positionRu: '', email: 'someone@gmail.com', phone: '+996 700 123 456', organizationId: 'org-x' }, seed.organizations);
  assert.ok(!bad.ok);
  if (!bad.ok) assert.deepEqual(bad.fields, { name: 'required', positionRu: 'required', email: 'email-not-demo', phone: 'phone-not-demo', organizationId: 'unknown-organization' });
  const invalid = validateContact({ ...NEW, email: 'not-an-email' }, seed.organizations);
  assert.ok(!invalid.ok && invalid.fields.email === 'email-invalid');
  assert.equal(contactInput(contact('contact-1')).tags, 'лейбл');
});

void test('permissions: viewer can only read; manager and lead can change (prototype checks)', () => {
  const viewer = as('crm-viewer');
  assert.deepEqual(createContact(NEW, seed.organizations, viewer), { ok: false, error: 'forbidden' });
  assert.deepEqual(updateContact(contact('contact-1'), NEW, seed.organizations, viewer), { ok: false, error: 'forbidden' });
  assert.deepEqual(linkContact(contact('contact-7'), 'org-1', seed.organizations, viewer), { ok: false, error: 'forbidden' });
  assert.deepEqual(changeRelationship(org('org-4'), 'negotiating', undefined, viewer), { ok: false, error: 'forbidden' });
  assert.deepEqual(logInteraction(LOG, seed.contacts, seed.organizations, viewer), { ok: false, error: 'forbidden' });
  assert.deepEqual(createOrganization({ name: 'X (демо)', kind: 'label', city: 'Ош', about: '', tags: '' }, viewer), { ok: false, error: 'forbidden' });
  for (const role of ['crm-manager', 'crm-partnership-lead']) {
    assert.ok(createContact(NEW, seed.organizations, as(role)).ok, role);
    assert.ok(changeRelationship(org('org-4'), 'negotiating', undefined, as(role)).ok, role);
  }
  assert.deepEqual(createContact(NEW, seed.organizations, as('arm-super-admin')), { ok: false, error: 'forbidden' }, 'ARM roles have no CRM rights');
});

void test('contact edits, status and organization links write audit events', () => {
  const created = createContact(NEW, seed.organizations, as('crm-manager'));
  assert.ok(created.ok);
  if (created.ok) {
    const event = created.audit('contacts-mmusic-crm-1');
    assert.equal(event.action, 'contact.create');
    assert.equal(event.actorId, 'staff-crm-2');
  }
  const off = updateContact(contact('contact-1'), { ...contactInput(contact('contact-1')), status: 'inactive' }, seed.organizations, as('crm-manager'));
  assert.ok(off.ok && off.event.action === 'contact.status' && off.event.fromStatus === 'active' && off.event.toStatus === 'inactive');
  const edit = updateContact(contact('contact-1'), { ...contactInput(contact('contact-1')), positionRu: 'Директор' }, seed.organizations, as('crm-manager'));
  assert.ok(edit.ok && edit.event.action === 'contact.update' && edit.patch.position?.ru === 'Директор');
  assert.deepEqual(linkContact(contact('contact-1'), 'org-1', seed.organizations, as('crm-manager')), { ok: false, error: 'same-status' });
  const linked = linkContact(contact('contact-7'), 'org-4', seed.organizations, as('crm-manager'));
  assert.ok(linked.ok && linked.event.action === 'contact.link' && linked.patch.organizationId === 'org-4');
  const unlinked = linkContact(contact('contact-1'), '', seed.organizations, as('crm-manager'));
  assert.ok(unlinked.ok && unlinked.event.action === 'contact.unlink' && unlinked.patch.organizationId === undefined);
});

void test('organizations start as prospects; relationship changes are audited', () => {
  const created = createOrganization({ name: ' Новый лейбл (демо) ', kind: 'label', city: 'Бишкек', about: '', tags: '' }, as('crm-manager'));
  assert.ok(created.ok && created.record.relationship === 'prospect' && created.record.name === 'Новый лейбл (демо)');
  const bad = createOrganization({ name: '', kind: 'label', city: '', about: 'x'.repeat(301), tags: '' }, as('crm-manager'));
  assert.ok(!bad.ok && bad.error === 'invalid' && bad.fields.name === 'required' && bad.fields.city === 'required' && bad.fields.about === 'too-long');
  const moved = changeRelationship(org('org-2'), 'active', 'Договорились о пилотной афише (демо)', as('crm-partnership-lead'));
  assert.ok(moved.ok && moved.event.fromStatus === 'negotiating' && moved.event.toStatus === 'active' && moved.event.reason?.includes('пилотной'));
  assert.deepEqual(changeRelationship(org('org-1'), 'active', undefined, as('crm-manager')), { ok: false, error: 'same-status' });
});

void test('interactions: target required, contact organization attached, follow-up after the interaction', () => {
  const ok = logInteraction(LOG, seed.contacts, seed.organizations, as('crm-manager'));
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.record.organizationId, 'org-2', 'organization taken from the contact');
    assert.equal(ok.record.authorId, 'staff-crm-2');
    assert.equal(ok.audit('int-x').action, 'interaction.call');
  }
  const none = logInteraction({ ...LOG, contactId: '', summary: ' ' }, seed.contacts, seed.organizations, as('crm-manager'));
  assert.ok(!none.ok && none.error === 'invalid' && none.fields.contactId === 'target-required' && none.fields.summary === 'required');
  const early = logInteraction({ ...LOG, followUpAt: '2026-10-20T10:00' }, seed.contacts, seed.organizations, as('crm-manager'));
  assert.ok(!early.ok && early.error === 'invalid' && early.fields.followUpAt === 'follow-up-before');
  const orgOnly = logInteraction({ ...LOG, contactId: '', organizationId: 'org-5', kind: 'note' }, seed.contacts, seed.organizations, as('crm-manager'));
  assert.ok(orgOnly.ok && !orgOnly.record.contactId && orgOnly.record.organizationId === 'org-5');
  const open = seed.interactions.find((i) => i.followUpAt && !i.followUpDone)!;
  const done = completeFollowUp(open, as('crm-manager'));
  assert.ok(done.ok && done.patch.followUpDone === true);
  assert.deepEqual(completeFollowUp({ ...open, followUpDone: true }, as('crm-manager')), { ok: false, error: 'same-status' });
  assert.deepEqual(completeFollowUp(open, as('crm-viewer')), { ok: false, error: 'forbidden' });
});

void test('dashboard figures are counted from the demo records', () => {
  const s = crmSummary(seed, NOW);
  assert.deepEqual(s, { activeContacts: 7, contacts: 8, organizations: 7, activePartners: 3, prospective: 3, interactions30d: 12, openFollowUps: 5, overdueFollowUps: 1 });
  const follow = openFollowUps(seed.interactions, NOW);
  assert.ok(follow.every((f, i, arr) => i === 0 || arr[i - 1]!.interaction.followUpAt! <= f.interaction.followUpAt!));
  assert.equal(follow.find((f) => f.overdue)?.interaction.id, 'int-5');
});

void test('created contacts persist across reloads; reset restores the seed', async () => {
  const backend = memoryBackend();
  const open = () => createMockDataSource<CrmCollections>({ namespace: 'mmusic-crm', version: 3, seed: crmSeed, storage: createSafeStorage(backend) });
  const ds = open();
  const out = createContact(NEW, seed.organizations, as('crm-manager'));
  assert.ok(out.ok);
  if (!out.ok) return;
  const created = (await ds.repository('contacts').create(out.record)) as CrmContact;
  await ds.repository('activity').create(out.audit(created.id));
  const reloaded = open();
  assert.equal(((await reloaded.repository('contacts').get(created.id)) as CrmContact).email, 'test@example.kg');
  assert.equal((await reloaded.repository('activity').list()).length, seed.activity.length + 1);
  reloaded.reset();
  assert.equal(await open().repository('contacts').get(created.id), undefined);
  assert.equal((await open().repository('contacts').list()).length, seed.contacts.length);
});
