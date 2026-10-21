import type { CrmArtist, CrmContact, CrmOrganization, Deal, Interaction, Task } from './types.ts';

/**
 * Fictional unified-CRM demo data: solo artists and two music groups, all invented and marked "(демо)", with
 * example.kg e-mails and +996 555 000 0xx numbers; no legal names and no real artists or partnerships. One artist
 * plays in both groups — a single record referenced twice — to show that group members are not duplicated.
 * Profile images are generated initials (no photos). Deal values are fictional estimates.
 */

const artist = (id: string, stageName: string, genres: string[], city: string, collaboration: CrmArtist['collaboration'], createdAt: string, rest: Partial<CrmArtist> = {}): CrmArtist => ({
  id, mock: true, stageName, genres, city, collaboration, createdAt, ...rest,
});

export const ARTISTS: CrmArtist[] = [
  artist('artist-1', 'Ай-Нур (демо)', ['Pop', 'Kyrgyz Pop'], 'Бишкек', 'negotiating', '2026-10-05T09:00:00.000Z', { managerContactId: 'contact-7', email: 'ainur@example.kg', phone: '+996 555 000 031', collaborationChangedAt: '2026-10-16T10:00:00.000Z', notes: 'Соло-исполнительница поп-музыки (вымышленная). Связь через менеджера.' }),
  artist('artist-2', 'Nomad Pulse (демо)', ['Electronic', 'Hip-Hop'], 'Ош', 'prospect', '2026-10-11T12:00:00.000Z', { managerContactId: 'contact-7', notes: 'Электронный продюсер (вымышленный).' }),
  artist('artist-3', 'Бек Тоо (демо)', ['Kyrgyz Folk', 'Rock'], 'Бишкек', 'active', '2026-10-07T10:00:00.000Z', { email: 'bektoo@example.kg', collaborationChangedAt: '2026-10-15T09:00:00.000Z', notes: 'Вокалист группы и сольный исполнитель (вымышленный).' }),
  artist('artist-4', 'Тим Струна (демо)', ['Rock', 'Jazz'], 'Каракол', 'prospect', '2026-10-07T10:30:00.000Z', { notes: 'Гитарист двух групп (вымышленный).' }),
  artist('artist-5', 'Алтын Ритм (демо)', ['Rock'], 'Бишкек', 'prospect', '2026-10-07T11:00:00.000Z'),
  artist('artist-6', 'Сезим Ноты (демо)', ['Kyrgyz Folk', 'Neo-Classical'], 'Каракол', 'paused', '2026-10-09T14:00:00.000Z', { collaborationChangedAt: '2026-10-18T12:00:00.000Z', notes: 'Скрипачка (вымышленная); пауза до весны.' }),
];

export const GROUPS: CrmOrganization[] = [
  {
    id: 'group-1', mock: true, name: 'Тоо Ыры Бэнд (демо)', kind: 'group', city: 'Бишкек', relationship: 'negotiating', relationshipChangedAt: '2026-10-17T11:00:00.000Z', createdAt: '2026-10-07T09:30:00.000Z', tags: ['группа'],
    about: 'Фолк-рок-группа (вымышленная). Творческий коллектив, не юрлицо.',
    members: [
      { artistId: 'artist-3', role: 'Вокал', joinedAt: '2026-10-07T09:30:00.000Z' },
      { artistId: 'artist-4', role: 'Гитара', joinedAt: '2026-10-07T09:30:00.000Z' },
      { artistId: 'artist-5', role: 'Ударные', joinedAt: '2026-10-07T09:30:00.000Z' },
    ],
  },
  {
    id: 'group-2', mock: true, name: 'Шамал Трио (демо)', kind: 'group', city: 'Каракол', relationship: 'prospect', createdAt: '2026-10-09T13:30:00.000Z', tags: ['группа'],
    about: 'Акустическое трио (вымышленное).',
    members: [
      { artistId: 'artist-4', role: 'Гитара', joinedAt: '2026-10-09T13:30:00.000Z' },
      { artistId: 'artist-6', role: 'Скрипка', joinedAt: '2026-10-09T13:30:00.000Z' },
    ],
  },
];

export const GROUP_CONTACTS: CrmContact[] = [
  { id: 'contact-9', mock: true, name: 'Эрмек Осмонов', position: { ru: 'Директор группы', en: 'Band manager' }, organizationId: 'group-1', email: 'ermek@example.kg', phone: '+996 555 000 019', tags: ['группа'], createdAt: '2026-10-07T09:40:00.000Z', status: 'active' },
];

export const ARTIST_DEALS: Deal[] = [
  { id: 'deal-a1', mock: true, title: 'Сольная подборка Ай-Нур в приложении', artistId: 'artist-1', contactId: 'contact-7', ownerId: 'staff-crm-2', stage: 'qualified', estimatedValueKgs: 40000, expectedCloseAt: '2026-11-30', description: 'Идея: авторская подборка артистки на главной (демо).', createdAt: '2026-10-16T10:30:00.000Z', stageChangedAt: '2026-10-18T09:00:00.000Z' },
  { id: 'deal-a2', mock: true, title: 'Живой сет группы для промо-плейлиста', organizationId: 'group-1', contactId: 'contact-9', ownerId: 'staff-crm-1', stage: 'lead', createdAt: '2026-10-17T11:30:00.000Z', stageChangedAt: '2026-10-17T11:30:00.000Z' },
];

export const ARTIST_TASKS: Task[] = [
  { id: 'task-a1', mock: true, title: 'Запросить у менеджера список треков для подборки', status: 'pending', priority: 'normal', assigneeId: 'staff-crm-2', dueAt: '2026-10-27T09:00:00.000Z', artistId: 'artist-1', contactId: 'contact-7', dealId: 'deal-a1', createdAt: '2026-10-18T09:10:00.000Z' },
  { id: 'task-a2', mock: true, title: 'Уточнить состав группы для афиши', status: 'in-progress', priority: 'high', assigneeId: 'staff-crm-1', dueAt: '2026-10-24T12:00:00.000Z', organizationId: 'group-1', contactId: 'contact-9', dealId: 'deal-a2', createdAt: '2026-10-17T12:00:00.000Z' },
];

export const ARTIST_INTERACTIONS: Interaction[] = [
  { id: 'int-a1', mock: true, kind: 'call', at: '2026-10-16T10:00:00.000Z', summary: 'Созвон с менеджером Ай-Нур: интерес к сольной подборке (демо).', artistId: 'artist-1', contactId: 'contact-7', authorId: 'staff-crm-2', followUpAt: '2026-10-25T09:00:00.000Z', createdAt: '2026-10-16T10:00:00.000Z' },
  { id: 'int-a2', mock: true, kind: 'meeting', at: '2026-10-17T11:00:00.000Z', summary: 'Встреча с группой на репетиции: обсудили живой сет (демо).', organizationId: 'group-1', contactId: 'contact-9', authorId: 'staff-crm-1', createdAt: '2026-10-17T11:00:00.000Z' },
  { id: 'int-a3', mock: true, kind: 'note', at: '2026-10-18T12:00:00.000Z', summary: 'Сезим попросила вернуться к разговору весной (демо).', artistId: 'artist-6', authorId: 'staff-crm-1', createdAt: '2026-10-18T12:00:00.000Z' },
];

/** The unified-CRM demo records (seed, and added by the v4 → v5 migration when missing). */
export function unifiedSeed() {
  return structuredClone({ artists: ARTISTS, groups: GROUPS, contacts: GROUP_CONTACTS, deals: ARTIST_DEALS, tasks: ARTIST_TASKS, interactions: ARTIST_INTERACTIONS });
}
