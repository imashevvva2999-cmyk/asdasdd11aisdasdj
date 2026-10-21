import type { Contact, Organization, StaffUser } from './domain.ts';

/**
 * Fictional seed data for the prototypes. Every person, company, e-mail and phone number here is invented
 * (reserved example.* domains, +996 555 000 0xx numbers); none describes a real person, a real company or a real
 * artist's business. Real catalog metadata (public) comes from @mmusic/core and is never mixed with these records.
 */

export const DEMO_STAFF: StaffUser[] = [
  { id: 'staff-arm-1', mock: true, app: 'arm', roleId: 'arm-super-admin', name: 'Айгерим Токтосунова', email: 'aigerim.t@example.kg', title: { ru: 'Руководитель платформы', en: 'Platform lead' } },
  { id: 'staff-arm-2', mock: true, app: 'arm', roleId: 'arm-moderator', name: 'Нурбек Асанов', email: 'nurbek.a@example.kg', title: { ru: 'Модератор контента', en: 'Content moderator' } },
  { id: 'staff-arm-3', mock: true, app: 'arm', roleId: 'arm-support', name: 'Элина Садыкова', email: 'elina.s@example.kg', title: { ru: 'Специалист поддержки', en: 'Support specialist' } },
  { id: 'staff-arm-4', mock: true, app: 'arm', roleId: 'arm-finance', name: 'Тимур Жумабаев', email: 'timur.j@example.kg', title: { ru: 'Финансовый аналитик', en: 'Finance analyst' } },
  { id: 'staff-arm-5', mock: true, app: 'arm', roleId: 'arm-analyst', name: 'Алина Ким', email: 'alina.k@example.kg', title: { ru: 'Продуктовый аналитик', en: 'Product analyst' } },
  { id: 'staff-crm-1', mock: true, app: 'crm', roleId: 'crm-partnership-lead', name: 'Данияр Осмонов', email: 'daniyar.o@example.kg', title: { ru: 'Руководитель партнёрств', en: 'Partnerships lead' } },
  { id: 'staff-crm-2', mock: true, app: 'crm', roleId: 'crm-manager', name: 'Мээрим Абдыкадырова', email: 'meerim.a@example.kg', title: { ru: 'A&R-менеджер', en: 'A&R manager' } },
  { id: 'staff-crm-3', mock: true, app: 'crm', roleId: 'crm-viewer', name: 'Руслан Бекматов', email: 'ruslan.b@example.kg', title: { ru: 'Стажёр', en: 'Intern' } },
];

export const DEMO_ORGANIZATIONS: Organization[] = [
  { id: 'org-1', mock: true, name: 'Ала-Тоо Рекордс (демо)', kind: 'label', city: 'Бишкек', createdAt: '2026-08-04T09:00:00.000Z' },
  { id: 'org-2', mock: true, name: 'Клуб «Северное сияние» (демо)', kind: 'venue', city: 'Бишкек', createdAt: '2026-08-12T09:00:00.000Z' },
  { id: 'org-3', mock: true, name: 'ТяньШань Медиа (демо)', kind: 'media', city: 'Ош', createdAt: '2026-08-20T09:00:00.000Z' },
  { id: 'org-4', mock: true, name: 'Агентство «Кок-Жар» (демо)', kind: 'agency', city: 'Бишкек', createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'org-5', mock: true, name: 'Фестиваль «Иссык-Куль Саунд» (демо)', kind: 'sponsor', city: 'Чолпон-Ата', createdAt: '2026-09-15T09:00:00.000Z' },
  { id: 'org-6', mock: true, name: 'Отдел партнёрских программ банка (демо)', kind: 'bank-unit', city: 'Бишкек', createdAt: '2026-09-28T09:00:00.000Z' },
];

export const DEMO_CONTACTS: Contact[] = [
  { id: 'contact-1', mock: true, name: 'Бакыт Исаков', position: { ru: 'Директор лейбла', en: 'Label director' }, organizationId: 'org-1', email: 'bakyt@example.kg', phone: '+996 555 000 011', tags: ['лейбл'], createdAt: '2026-08-05T10:00:00.000Z' },
  { id: 'contact-2', mock: true, name: 'Жылдыз Маматова', position: { ru: 'Арт-директор', en: 'Art director' }, organizationId: 'org-2', email: 'jyldyz@example.kg', phone: '+996 555 000 012', tags: ['площадка'], createdAt: '2026-08-13T10:00:00.000Z' },
  { id: 'contact-3', mock: true, name: 'Эрлан Касымов', position: { ru: 'Главный редактор', en: 'Editor-in-chief' }, organizationId: 'org-3', email: 'erlan@example.kg', phone: '+996 555 000 013', tags: ['медиа'], createdAt: '2026-08-21T10:00:00.000Z' },
  { id: 'contact-4', mock: true, name: 'Асель Нурланова', position: { ru: 'Букинг-менеджер', en: 'Booking manager' }, organizationId: 'org-4', email: 'asel@example.kg', phone: '+996 555 000 014', tags: ['агентство'], createdAt: '2026-09-02T10:00:00.000Z' },
  { id: 'contact-5', mock: true, name: 'Улан Токтогулов', position: { ru: 'Продюсер фестиваля', en: 'Festival producer' }, organizationId: 'org-5', email: 'ulan@example.kg', phone: '+996 555 000 015', tags: ['спонсор', 'фестиваль'], createdAt: '2026-09-16T10:00:00.000Z' },
  { id: 'contact-6', mock: true, name: 'Камила Ахмедова', position: { ru: 'Менеджер партнёрских программ', en: 'Partner programmes manager' }, organizationId: 'org-6', email: 'kamila@example.kg', phone: '+996 555 000 016', tags: ['банк'], createdAt: '2026-09-29T10:00:00.000Z' },
  { id: 'contact-7', mock: true, name: 'Санжар Алиев', position: { ru: 'Независимый продюсер', en: 'Independent producer' }, email: 'sanjar@example.kg', phone: '+996 555 000 017', tags: ['продюсер'], createdAt: '2026-10-03T10:00:00.000Z' },
];
