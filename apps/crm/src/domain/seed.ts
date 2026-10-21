import { DEMO_CONTACTS, DEMO_ORGANIZATIONS } from '@mmusic/backoffice/mocks';

import { crmOrgKind, LEGACY_KINDS } from './artists.ts';
import { unifiedSeed } from './seed-artists.ts';
import { DEALS, SEED_M5_EVENTS, TASKS } from './seed-m5.ts';
import { defaultM6Data } from './seed-m6.ts';
import type { CrmCollections, CrmContact, CrmOrganization, Interaction, RelationshipStatus } from './types.ts';

/**
 * Fictional CRM demo data (M4): the shared back-office demo contacts and organizations (packages/backoffice mocks)
 * plus CRM-only fields, a few more invented records and manually logged interactions. Organizations are marked
 * "(демо)"; e-mails use example.kg, phones +996 555 000 0xx. Interactions describe conversations only — no
 * agreements, terms, amounts or results.
 */

const RELATIONSHIP: Record<string, RelationshipStatus> = { 'org-1': 'active', 'org-2': 'negotiating', 'org-3': 'active', 'org-4': 'prospect', 'org-5': 'prospect', 'org-6': 'active' };

const ABOUT: Record<string, string> = {
  'org-1': 'Независимый лейбл электронной и инди-музыки (вымышленный).',
  'org-2': 'Концертная площадка на 400 мест (вымышленная).',
  'org-3': 'Музыкальное онлайн-медиа юга страны (вымышленное).',
  'org-4': 'Букинг-агентство артистов (вымышленное).',
  'org-5': 'Летний фестиваль на побережье (вымышленный).',
  'org-6': 'Внутренний отдел банка по партнёрским программам (вымышленный).',
};

/** Fictional organization tags (M6). */
const ORG_TAGS: Record<string, string[]> = { 'org-1': ['лейбл'], 'org-2': ['площадка'], 'org-3': ['медиа'], 'org-5': ['фестиваль'], 'org-6': ['банк'], 'org-7': ['медиа'] };

const EXTRA_ORGANIZATIONS: CrmOrganization[] = [
  { id: 'org-7', mock: true, name: 'Подкаст «Ритм города» (демо)', kind: 'media', city: 'Бишкек', createdAt: '2026-10-02T09:00:00.000Z', relationship: 'paused', relationshipChangedAt: '2026-10-14T11:00:00.000Z', about: 'Подкаст о городской музыкальной сцене (вымышленный).' },
];

const EXTRA_CONTACTS: CrmContact[] = [
  { id: 'contact-8', mock: true, name: 'Айдай Жумабекова', position: { ru: 'Ведущая подкаста', en: 'Podcast host' }, organizationId: 'org-7', email: 'aidai@example.kg', phone: '+996 555 000 018', tags: ['медиа'], createdAt: '2026-10-02T10:00:00.000Z', status: 'inactive' },
];

const interaction = (n: number, kind: Interaction['kind'], at: string, summary: string, contactId: string | undefined, organizationId: string | undefined, authorId: string, rest: Partial<Interaction> = {}): Interaction => ({
  id: `int-${n}`, mock: true, kind, at, summary, ...(contactId ? { contactId } : {}), ...(organizationId ? { organizationId } : {}), authorId, createdAt: at, ...rest,
});

const INTERACTIONS: Interaction[] = [
  interaction(1, 'meeting', '2026-10-03T10:00:00.000Z', 'Знакомство с командой лейбла: обсудили идею совместной редакционной подборки (демо).', 'contact-1', 'org-1', 'staff-crm-1'),
  interaction(2, 'email', '2026-10-06T08:30:00.000Z', 'Отправлено письмо с описанием возможностей платформы для артистов лейбла (демо).', 'contact-1', 'org-1', 'staff-crm-2'),
  interaction(3, 'call', '2026-10-08T12:15:00.000Z', 'Созвон с арт-директором площадки: интерес к афише концертов в приложении (демо).', 'contact-2', 'org-2', 'staff-crm-2', { followUpAt: '2026-10-24T09:00:00.000Z' }),
  interaction(4, 'note', '2026-10-09T15:00:00.000Z', 'Медиа готово упоминать новые релизы платформы в еженедельном обзоре (демо).', 'contact-3', 'org-3', 'staff-crm-1'),
  interaction(5, 'meeting', '2026-10-10T11:00:00.000Z', 'Встреча с агентством: попросили презентацию для артистов (демо).', 'contact-4', 'org-4', 'staff-crm-2', { followUpAt: '2026-10-18T09:00:00.000Z' }),
  interaction(6, 'email', '2026-10-12T07:45:00.000Z', 'Первое письмо продюсеру фестиваля с предложением познакомиться (демо).', 'contact-5', 'org-5', 'staff-crm-2', { followUpAt: '2026-10-28T09:00:00.000Z' }),
  interaction(7, 'call', '2026-10-13T09:20:00.000Z', 'Звонок в отдел партнёрских программ: уточнили контактное лицо (демо).', 'contact-6', 'org-6', 'staff-crm-1', { followUpAt: '2026-10-16T09:00:00.000Z', followUpDone: true }),
  interaction(8, 'note', '2026-10-14T11:00:00.000Z', 'Подкаст взял паузу в выпусках — вернуться к разговору позже (демо).', 'contact-8', 'org-7', 'staff-crm-1'),
  interaction(9, 'meeting', '2026-10-15T13:30:00.000Z', 'Встреча с независимым продюсером: интерес к загрузке треков его артистов (демо).', 'contact-7', undefined, 'staff-crm-2', { followUpAt: '2026-11-04T09:00:00.000Z' }),
  interaction(10, 'call', '2026-10-17T10:10:00.000Z', 'Повторный созвон с лейблом: согласовали дату следующей встречи (демо).', 'contact-1', 'org-1', 'staff-crm-1', { followUpAt: '2026-10-22T08:00:00.000Z' }),
  interaction(11, 'email', '2026-10-19T16:40:00.000Z', 'Медиа прислало вопросы для интервью с командой платформы (демо).', 'contact-3', 'org-3', 'staff-crm-2'),
  interaction(12, 'note', '2026-10-20T09:00:00.000Z', 'Площадка просит прислать технические требования к афише (демо).', undefined, 'org-2', 'staff-crm-2'),
];

/** Full demo set: M4–M6 records (organization types mapped to the unified CRM types) plus artists and groups. */
export function crmSeed(): CrmCollections {
  const unified = unifiedSeed();
  // Shared demo organizations carry the pre-unified types; they are mapped from what each record describes, and the
  // legacy type is kept in `formerKind` (same rule as the migration).
  const organizations: CrmOrganization[] = [
    ...DEMO_ORGANIZATIONS.map((o) => {
      const own = { ...o, ...(ABOUT[o.id] ? { about: ABOUT[o.id] } : {}), tags: ORG_TAGS[o.id] ?? [] };
      return { ...own, kind: crmOrgKind(o.kind, own), ...((LEGACY_KINDS as readonly string[]).includes(o.kind) ? { formerKind: o.kind } : {}), relationship: RELATIONSHIP[o.id] ?? 'prospect' };
    }),
    ...EXTRA_ORGANIZATIONS.map((o) => ({ ...o, tags: ORG_TAGS[o.id] ?? [] })),
  ];
  const contacts: CrmContact[] = [...DEMO_CONTACTS.map((c) => ({ ...c, status: 'active' as const })), ...EXTRA_CONTACTS, ...unified.contacts];
  return structuredClone({
    contacts,
    organizations: [...organizations, ...unified.groups],
    artists: unified.artists,
    interactions: [...INTERACTIONS, ...unified.interactions],
    deals: [...DEALS, ...unified.deals],
    tasks: [...TASKS, ...unified.tasks],
    activity: SEED_M5_EVENTS,
    ...defaultM6Data(),
  });
}
