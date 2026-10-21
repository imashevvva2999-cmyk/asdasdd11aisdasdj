import { createBrowserRouter, Navigate } from 'react-router';

import type { ActivityEvent, Localized } from '@mmusic/backoffice/domain';
import { DEMO_CONTACTS, DEMO_ORGANIZATIONS, DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { createBackoffice, useLocalized } from '@mmusic/backoffice/react';
import { AppShell, ComingSoonPage, NotFoundPage, RequirePermission, type NavGroup, type NavItem } from '@mmusic/backoffice/ui';

import { DashboardPage } from '@/pages/DashboardPage';

/** CRM's own back-office instance: storage namespace `mmusic-crm`, fictional contacts and companies, provisional CRM roles. */
export const backoffice = createBackoffice({
  app: 'crm',
  appName: { ru: 'CRM — отношения', en: 'CRM — Relationships' },
  namespace: 'mmusic-crm',
  dataVersion: 1,
  seed: () => ({ contacts: structuredClone(DEMO_CONTACTS), organizations: structuredClone(DEMO_ORGANIZATIONS), activity: [] as ActivityEvent[] }),
  staff: DEMO_STAFF,
});

type Section = NavItem & { milestone?: string; description?: Localized };

/** CRM sections (docs/arm-crm-plan.md §4). `milestone`: built in that milestone; until then an honest placeholder. */
const GROUPS: { label: Localized; sections: Section[] }[] = [
  {
    label: { ru: 'Обзор', en: 'Overview' },
    sections: [{ path: '/dashboard', label: { ru: 'Дашборд', en: 'Dashboard' }, icon: 'dashboard', permission: 'crm.dashboard.view' }],
  },
  {
    label: { ru: 'Отношения', en: 'Relationships' },
    sections: [
      { path: '/contacts', label: { ru: 'Контакты', en: 'Contacts' }, icon: 'contacts', permission: 'crm.contacts.view', milestone: 'M4', description: { ru: 'Карточки контактов, теги, связь с организациями.', en: 'Contact cards, tags, links to organizations.' } },
      { path: '/organizations', label: { ru: 'Организации', en: 'Organizations' }, icon: 'business', permission: 'crm.organizations.view', milestone: 'M4', description: { ru: 'Лейблы, площадки, спонсоры, медиа, агентства.', en: 'Labels, venues, sponsors, media, agencies.' } },
      { path: '/partners', label: { ru: 'Артисты и партнёры', en: 'Artists & partners' }, icon: 'handshake', permission: 'crm.partners.view', milestone: 'M4', description: { ru: 'Профили партнёров; без вымышленных деловых фактов о реальных артистах.', en: 'Partner profiles; no invented business facts about real artists.' } },
    ],
  },
  {
    label: { ru: 'Продажи', en: 'Pipeline' },
    sections: [
      { path: '/deals', label: { ru: 'Сделки', en: 'Deals' }, icon: 'view-kanban', permission: 'crm.deals.view', milestone: 'M5', description: { ru: 'Воронка партнёрств: доска и список.', en: 'Partnership pipeline: board and list.' } },
      { path: '/tasks', label: { ru: 'Задачи', en: 'Tasks' }, icon: 'task-alt', permission: 'crm.tasks.view', milestone: 'M5', description: { ru: 'Задачи и напоминания о follow-up внутри приложения.', en: 'Tasks and in-app follow-up reminders.' } },
    ],
  },
  {
    label: { ru: 'Активность', en: 'Activity' },
    sections: [
      { path: '/activity', label: { ru: 'Взаимодействия', en: 'Interactions' }, icon: 'forum', permission: 'crm.activity.view', milestone: 'M4', description: { ru: 'История звонков, встреч и писем (записывается вручную).', en: 'History of calls, meetings and e-mails (logged manually).' } },
      { path: '/reports', label: { ru: 'Аналитика', en: 'Analytics' }, icon: 'insights', permission: 'crm.reports.view', milestone: 'M5' },
    ],
  },
  {
    label: { ru: 'Система', en: 'System' },
    sections: [{ path: '/settings', label: { ru: 'Настройки', en: 'Settings' }, icon: 'tune', permission: 'crm.settings.manage', milestone: 'M5', description: { ru: 'Этапы воронки и теги.', en: 'Pipeline stages and tags.' } }],
  },
];

export const NAV: NavGroup[] = GROUPS.map((g) => ({ label: g.label, items: g.sections }));

function SectionPlaceholder({ section }: { section: Section }) {
  const l = useLocalized();
  return <ComingSoonPage title={l(section.label)} milestone={section.milestone ?? ''} description={section.description ? l(section.description) : undefined} />;
}

const planned = GROUPS.flatMap((g) => g.sections).filter((s) => s.milestone);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell nav={NAV} />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <RequirePermission permission="crm.dashboard.view">
            <DashboardPage />
          </RequirePermission>
        ),
      },
      ...planned.map((section) => ({
        path: section.path.slice(1),
        element: (
          <RequirePermission permission={section.permission}>
            <SectionPlaceholder section={section} />
          </RequirePermission>
        ),
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
