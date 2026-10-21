import type { ActivityEvent } from '@mmusic/backoffice/domain';

import type { Deal, Task } from './types.ts';

/**
 * Fictional M5 demo data: partnership opportunities with the demo organizations and CRM tasks. Values are fictional
 * estimates in KGS marked "оценка (демо)" in the UI — no revenue, contracts, signed agreements or payments exist.
 * "Won" only means both sides agreed to try the format (demo).
 */

const deal = (n: number, title: string, organizationId: string, contactId: string | undefined, ownerId: string, stage: Deal['stage'], estimatedValueKgs: number | undefined, createdAt: string, stageChangedAt: string, rest: Partial<Deal> = {}): Deal => ({
  id: `deal-${n}`, mock: true, title, organizationId, ...(contactId ? { contactId } : {}), ownerId, stage, ...(estimatedValueKgs === undefined ? {} : { estimatedValueKgs }), createdAt, stageChangedAt, ...rest,
});

export const DEALS: Deal[] = [
  deal(1, 'Совместная редакционная подборка лейбла', 'org-1', 'contact-1', 'staff-crm-1', 'negotiation', 120000, '2026-10-03T11:00:00.000Z', '2026-10-17T10:30:00.000Z', { expectedCloseAt: '2026-11-28', description: 'Идея: еженедельная подборка новых релизов лейбла в приложении (демо).' }),
  deal(2, 'Афиша концертов площадки в приложении', 'org-2', 'contact-2', 'staff-crm-2', 'proposal', 60000, '2026-10-08T13:00:00.000Z', '2026-10-20T09:30:00.000Z', { expectedCloseAt: '2026-11-15', description: 'Показ афиши площадки рядом с треками выступающих артистов (демо).' }),
  deal(3, 'Обзор новых релизов в медиа', 'org-3', 'contact-3', 'staff-crm-2', 'won', 30000, '2026-10-09T15:30:00.000Z', '2026-10-19T17:00:00.000Z', { closedAt: '2026-10-19T17:00:00.000Z', description: 'Стороны договорились попробовать формат; документов в CRM нет (демо).' }),
  deal(4, 'Презентация платформы для артистов агентства', 'org-4', 'contact-4', 'staff-crm-2', 'qualified', 45000, '2026-10-10T12:00:00.000Z', '2026-10-12T09:00:00.000Z', { expectedCloseAt: '2026-12-10' }),
  deal(5, 'Фестивальная подборка в приложении', 'org-5', 'contact-5', 'staff-crm-1', 'lead', undefined, '2026-10-12T08:00:00.000Z', '2026-10-12T08:00:00.000Z'),
  deal(6, 'Музыкальная программа для клиентов банка', 'org-6', 'contact-6', 'staff-crm-1', 'qualified', 200000, '2026-10-13T10:00:00.000Z', '2026-10-16T11:00:00.000Z', { expectedCloseAt: '2027-01-31', description: 'Внутренний пилот с отделом партнёрских программ (демо).' }),
  deal(7, 'Спецвыпуск подкаста о платформе', 'org-7', 'contact-8', 'staff-crm-1', 'lost', 15000, '2026-10-02T12:00:00.000Z', '2026-10-14T11:30:00.000Z', { closedAt: '2026-10-14T11:30:00.000Z', lostReason: 'Подкаст приостановил выпуски — вернуться к разговору позже (демо).' }),
];

const task = (n: number, title: string, status: Task['status'], priority: Task['priority'], assigneeId: string, dueAt: string | undefined, createdAt: string, rest: Partial<Task> = {}): Task => ({
  id: `task-${n}`, mock: true, title, status, priority, assigneeId, ...(dueAt ? { dueAt } : {}), createdAt, ...rest,
});

export const TASKS: Task[] = [
  task(1, 'Подготовить демо-презентацию для агентства', 'in-progress', 'high', 'staff-crm-2', '2026-10-19T12:00:00.000Z', '2026-10-10T12:30:00.000Z', { organizationId: 'org-4', contactId: 'contact-4', dealId: 'deal-4' }),
  task(2, 'Отправить лейблу план подборки на месяц', 'pending', 'normal', 'staff-crm-1', '2026-10-24T09:00:00.000Z', '2026-10-17T10:40:00.000Z', { organizationId: 'org-1', contactId: 'contact-1', dealId: 'deal-1' }),
  task(3, 'Собрать требования площадки к афише', 'pending', 'high', 'staff-crm-2', '2026-10-22T09:00:00.000Z', '2026-10-20T09:40:00.000Z', { organizationId: 'org-2', dealId: 'deal-2', description: 'Площадка просила технические требования (см. заметку от 20 окт.).' }),
  task(4, 'Уточнить формат пилота с отделом банка', 'pending', 'normal', 'staff-crm-1', '2026-11-05T09:00:00.000Z', '2026-10-16T11:10:00.000Z', { organizationId: 'org-6', contactId: 'contact-6', dealId: 'deal-6' }),
  task(5, 'Согласовать даты первого обзора релизов', 'completed', 'normal', 'staff-crm-2', '2026-10-18T09:00:00.000Z', '2026-10-15T10:00:00.000Z', { organizationId: 'org-3', dealId: 'deal-3', completedAt: '2026-10-17T15:20:00.000Z', completedBy: 'staff-crm-2' }),
  task(6, 'Найти контакт в команде фестиваля', 'pending', 'low', 'staff-crm-1', undefined, '2026-10-12T08:10:00.000Z', { organizationId: 'org-5', dealId: 'deal-5' }),
  task(7, 'Записать тизер для подкаста', 'cancelled', 'low', 'staff-crm-1', '2026-10-16T09:00:00.000Z', '2026-10-05T09:00:00.000Z', { organizationId: 'org-7', dealId: 'deal-7', cancelReason: 'Подкаст приостановил выпуски (демо).' }),
  task(8, 'Обновить теги контактов после встреч', 'pending', 'low', 'staff-crm-3', '2026-10-30T09:00:00.000Z', '2026-10-18T09:00:00.000Z'),
];

/** Audit events matching the seeded history (stage moves, the won and lost deals, a completed and a cancelled task). */
export const SEED_M5_EVENTS: ActivityEvent[] = [
  { id: 'seed-deal-1', mock: true, at: '2026-10-19T17:00:00.000Z', actorId: 'staff-crm-2', actorRoleId: 'crm-manager', action: 'deal.won', entity: { type: 'deal', id: 'deal-3', label: 'Обзор новых релизов в медиа' }, fromStatus: 'negotiation', toStatus: 'won' },
  { id: 'seed-deal-2', mock: true, at: '2026-10-14T11:30:00.000Z', actorId: 'staff-crm-1', actorRoleId: 'crm-partnership-lead', action: 'deal.lost', entity: { type: 'deal', id: 'deal-7', label: 'Спецвыпуск подкаста о платформе' }, fromStatus: 'proposal', toStatus: 'lost', reason: 'Подкаст приостановил выпуски — вернуться к разговору позже (демо).' },
  { id: 'seed-deal-3', mock: true, at: '2026-10-20T09:30:00.000Z', actorId: 'staff-crm-2', actorRoleId: 'crm-manager', action: 'deal.stage', entity: { type: 'deal', id: 'deal-2', label: 'Афиша концертов площадки в приложении' }, fromStatus: 'qualified', toStatus: 'proposal' },
  { id: 'seed-deal-4', mock: true, at: '2026-10-17T10:30:00.000Z', actorId: 'staff-crm-1', actorRoleId: 'crm-partnership-lead', action: 'deal.stage', entity: { type: 'deal', id: 'deal-1', label: 'Совместная редакционная подборка лейбла' }, fromStatus: 'proposal', toStatus: 'negotiation' },
  { id: 'seed-task-1', mock: true, at: '2026-10-17T15:20:00.000Z', actorId: 'staff-crm-2', actorRoleId: 'crm-manager', action: 'task.complete', entity: { type: 'task', id: 'task-5', label: 'Согласовать даты первого обзора релизов' }, fromStatus: 'pending', toStatus: 'completed' },
  { id: 'seed-task-2', mock: true, at: '2026-10-14T11:35:00.000Z', actorId: 'staff-crm-1', actorRoleId: 'crm-partnership-lead', action: 'task.cancel', entity: { type: 'task', id: 'task-7', label: 'Записать тизер для подкаста' }, fromStatus: 'pending', toStatus: 'cancelled', reason: 'Подкаст приостановил выпуски (демо).' },
];
