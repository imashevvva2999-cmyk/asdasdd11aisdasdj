import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMockDataSource } from '../src/data.ts';
import type { Contact, Organization } from '../src/domain.ts';
import { createLocaleStore, SHELL_STRINGS } from '../src/i18n.ts';
import { DEMO_CONTACTS, DEMO_ORGANIZATIONS, DEMO_STAFF } from '../src/mocks.ts';
import { DEFAULT_ROLES, rolesFor } from '../src/rbac.ts';
import { createSessionStore } from '../src/session.ts';
import { createSafeStorage, type StorageBackend } from '../src/storage.ts';

/** In-memory Web Storage fake; `blocked` throws like a disabled storage, `quota` throws on writes after the probe. */
function fakeStorage(mode: 'ok' | 'blocked' | 'quota' = 'ok') {
  const map = new Map<string, string>();
  let writes = 0;
  const backend: StorageBackend = {
    getItem: (k) => {
      if (mode === 'blocked') throw new Error('SecurityError');
      return map.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (mode === 'blocked') throw new Error('SecurityError');
      writes += 1;
      if (mode === 'quota' && writes > 1) throw new Error('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k) => {
      if (mode === 'blocked') throw new Error('SecurityError');
      map.delete(k);
    },
  };
  return { backend, map };
}

const seed = () => ({ organizations: structuredClone(DEMO_ORGANIZATIONS), contacts: structuredClone(DEMO_CONTACTS) });

void test('safe storage: local mode round-trips JSON', () => {
  const { backend } = fakeStorage();
  const s = createSafeStorage(backend);
  assert.equal(s.mode, 'local');
  assert.ok(s.setJSON('k', { a: 1 }));
  assert.deepEqual(s.getJSON('k'), { a: 1 });
  s.remove('k');
  assert.equal(s.getJSON('k'), undefined);
});

void test('safe storage: blocked storage falls back to memory without throwing', () => {
  const s = createSafeStorage(fakeStorage('blocked').backend);
  assert.equal(s.mode, 'memory');
  assert.equal(s.setJSON('k', 1), false);
  assert.equal(s.getJSON('k'), 1);
  assert.doesNotThrow(() => s.remove('k'));
  assert.equal(createSafeStorage(null).mode, 'memory');
});

void test('safe storage: a full quota switches to memory and keeps the value', () => {
  const s = createSafeStorage(fakeStorage('quota').backend);
  assert.equal(s.mode, 'local');
  assert.equal(s.setJSON('k', 'v'), false);
  assert.equal(s.mode, 'memory');
  assert.equal(s.getJSON('k'), 'v');
});

void test('safe storage: corrupt JSON reads as missing', () => {
  const { backend, map } = fakeStorage();
  map.set('k', '{not json');
  assert.equal(createSafeStorage(backend).getJSON('k'), undefined);
});

void test('mock data: seeded, every record flagged mock, edits persist across reloads', async () => {
  const { backend } = fakeStorage();
  const storage = createSafeStorage(backend);
  const ds = createMockDataSource({ namespace: 'test-crm', version: 1, seed, storage });
  const contacts = ds.repository('contacts');
  assert.equal((await contacts.list()).length, DEMO_CONTACTS.length);
  assert.ok((await contacts.list()).every((c) => c.mock === true));

  const created = await contacts.create({ name: 'Тест Тестов', position: { ru: 'Тест', en: 'Test' }, email: 't@example.kg', phone: '+996 555 000 099', tags: [], createdAt: '2026-10-21T00:00:00.000Z' } as Omit<Contact, 'id' | 'mock'>);
  assert.equal(created.mock, true);
  await contacts.update('contact-1', { name: 'Изменено' });
  assert.ok(await contacts.remove('contact-2'));
  assert.equal(await contacts.remove('missing'), false);

  const reloaded = createMockDataSource({ namespace: 'test-crm', version: 1, seed, storage: createSafeStorage(backend) });
  const list = await reloaded.repository('contacts').list();
  assert.equal(list.length, DEMO_CONTACTS.length);
  assert.equal(list.find((c) => c.id === 'contact-1')?.name, 'Изменено');
  assert.ok(list.some((c) => c.id === created.id));
  assert.ok(!list.some((c) => c.id === 'contact-2'));
});

void test('mock data: reset restores the seed and saves it', async () => {
  const { backend } = fakeStorage();
  const ds = createMockDataSource({ namespace: 'test-crm', version: 1, seed, storage: createSafeStorage(backend) });
  await ds.repository('organizations').remove('org-1');
  ds.reset();
  assert.equal((await ds.repository('organizations').list()).length, DEMO_ORGANIZATIONS.length);
  const reloaded = createMockDataSource({ namespace: 'test-crm', version: 1, seed, storage: createSafeStorage(backend) });
  assert.ok((await reloaded.repository('organizations').list()).some((o: Organization) => o.id === 'org-1'));
});

void test('mock data: apps are isolated by namespace', async () => {
  const { backend } = fakeStorage();
  const arm = createMockDataSource({ namespace: 'mmusic-arm', version: 1, seed, storage: createSafeStorage(backend) });
  const crm = createMockDataSource({ namespace: 'mmusic-crm', version: 1, seed, storage: createSafeStorage(backend) });
  await arm.repository('contacts').remove('contact-1');
  assert.ok((await crm.repository('contacts').list()).some((c) => c.id === 'contact-1'));
});

void test('mock data: a version bump or corrupt saved data falls back to the seed', async () => {
  const { backend, map } = fakeStorage();
  const v1 = createMockDataSource({ namespace: 'test', version: 1, seed, storage: createSafeStorage(backend) });
  await v1.repository('contacts').remove('contact-1');
  const v2 = createMockDataSource({ namespace: 'test', version: 2, seed, storage: createSafeStorage(backend) });
  assert.ok((await v2.repository('contacts').list()).some((c) => c.id === 'contact-1'));
  map.set('test:data', '{"version":2,"data":{"contacts":"oops"},"nextId":1}');
  const bad = createMockDataSource({ namespace: 'test', version: 2, seed, storage: createSafeStorage(backend) });
  assert.equal((await bad.repository('contacts').list()).length, DEMO_CONTACTS.length);
});

void test('mock data: works in memory when storage is blocked', async () => {
  const ds = createMockDataSource({ namespace: 'test', version: 1, seed, storage: createSafeStorage(fakeStorage('blocked').backend) });
  assert.equal(ds.persistence(), 'memory');
  await ds.repository('contacts').remove('contact-1');
  assert.equal((await ds.repository('contacts').list()).length, DEMO_CONTACTS.length - 1);
});

void test('fictional seeds: example.* e-mails, reserved test numbers, demo-labelled companies', () => {
  for (const p of [...DEMO_STAFF, ...DEMO_CONTACTS]) assert.match(p.email, /@example\.kg$/, p.id);
  for (const c of DEMO_CONTACTS) assert.match(c.phone, /^\+996 555 000 0\d\d$/, c.id);
  for (const o of DEMO_ORGANIZATIONS) assert.match(o.name, /\(демо\)$/, o.id);
  for (const s of DEMO_STAFF) assert.ok(rolesFor(s.app).some((r) => r.id === s.roleId), s.id);
});

void test('locale: Russian by default, remembered, invalid values ignored', () => {
  const { backend, map } = fakeStorage();
  const store = createLocaleStore(createSafeStorage(backend), 'x:locale');
  assert.equal(store.getState().locale, 'ru');
  store.getState().setLocale('en');
  assert.equal(createLocaleStore(createSafeStorage(backend), 'x:locale').getState().locale, 'en');
  map.set('x:locale', '"de"');
  assert.equal(createLocaleStore(createSafeStorage(backend), 'x:locale').getState().locale, 'ru');
});

void test('shell strings: RU and EN define the same keys', () => {
  assert.deepEqual(Object.keys(SHELL_STRINGS.ru).sort(), Object.keys(SHELL_STRINGS.en).sort());
});

void test('dev role session: remembered per app, foreign or unknown roles rejected', () => {
  const { backend, map } = fakeStorage();
  const arm = rolesFor('arm', DEFAULT_ROLES);
  const session = createSessionStore(createSafeStorage(backend), 'arm:dev-role', arm);
  assert.equal(session.getState().roleId, 'arm-super-admin');
  session.getState().setRole('arm-finance');
  session.getState().setRole('crm-viewer');
  assert.equal(session.getState().roleId, 'arm-finance');
  assert.equal(createSessionStore(createSafeStorage(backend), 'arm:dev-role', arm).getState().roleId, 'arm-finance');
  map.set('arm:dev-role', '"crm-viewer"');
  assert.equal(createSessionStore(createSafeStorage(backend), 'arm:dev-role', arm).getState().roleId, 'arm-super-admin');
});
