import type { OrganizationKind } from '@mmusic/backoffice/domain';
import type { StringTable } from '@mmusic/backoffice/i18n';

/** CRM page text (RU default, EN). Shell text lives in @mmusic/backoffice. */
export const CRM_STRINGS = {
  ru: {
    dashboardTitle: 'Дашборд',
    dashboardSubtitle: 'CRM Mmusic — фундамент (этап M1). Все контакты и компании вымышленные.',
    contacts: 'Контакты',
    organizations: 'Организации',
    contactsHint: 'Вымышленные люди',
    organizationsHint: 'Вымышленные компании',
    recentTitle: 'Последние контакты',
    noOrganization: 'Без организации',
    kindsTitle: 'Организации по типу',
    roadmapTitle: 'Что появится дальше',
    roadmapM4: 'M4 — контакты, организации, профили партнёров, история взаимодействий',
    roadmapM5: 'M5 — воронка сделок, задачи и follow-up, аналитика',
    roadmapM6: 'M6 — экран ролей и прав, применение прав к действиям',
  },
  en: {
    dashboardTitle: 'Dashboard',
    dashboardSubtitle: 'Mmusic CRM — foundation (milestone M1). All contacts and companies are fictional.',
    contacts: 'Contacts',
    organizations: 'Organizations',
    contactsHint: 'Fictional people',
    organizationsHint: 'Fictional companies',
    recentTitle: 'Recent contacts',
    noOrganization: 'No organization',
    kindsTitle: 'Organizations by type',
    roadmapTitle: 'Coming next',
    roadmapM4: 'M4 — contacts, organizations, partner profiles, interaction history',
    roadmapM5: 'M5 — deals pipeline, tasks and follow-ups, analytics',
    roadmapM6: 'M6 — roles and permissions screen, permissions applied to actions',
  },
} as const satisfies StringTable<string>;

export const ORGANIZATION_KIND_LABELS: Record<OrganizationKind, { ru: string; en: string }> = {
  label: { ru: 'Лейбл', en: 'Label' },
  venue: { ru: 'Площадка', en: 'Venue' },
  sponsor: { ru: 'Спонсор / фестиваль', en: 'Sponsor / festival' },
  media: { ru: 'Медиа', en: 'Media' },
  agency: { ru: 'Агентство', en: 'Agency' },
  'bank-unit': { ru: 'Подразделение банка', en: 'Bank unit' },
};
