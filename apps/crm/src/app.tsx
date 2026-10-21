import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import type { Localized } from '@mmusic/backoffice/domain';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import type { Permission } from '@mmusic/backoffice/rbac';
import { createBackoffice, useLocalized } from '@mmusic/backoffice/react';
import { AppShell, ComingSoonPage, NotFoundPage, RequirePermission, type NavGroup, type NavItem } from '@mmusic/backoffice/ui';

import { crmSeed } from '@/domain/seed';
import { ContactDetailPage, ContactFormPage, ContactsPage } from '@/pages/ContactPages';
import { DashboardPage } from '@/pages/DashboardPage';
import { InteractionsPage } from '@/pages/InteractionsPage';
import { OrganizationDetailPage, OrganizationFormPage, OrganizationsPage } from '@/pages/OrganizationPages';
import { PartnersPage } from '@/pages/PartnersPage';

/** CRM's own back-office instance: storage namespace `mmusic-crm`, fictional contacts and companies, provisional CRM roles. */
export const backoffice = createBackoffice({
  app: 'crm',
  appName: { ru: 'CRM — отношения', en: 'CRM — Relationships' },
  namespace: 'mmusic-crm',
  // v2 (M4): contact status, organization relationship, interactions; saved v1 data is re-seeded.
  dataVersion: 2,
  seed: crmSeed,
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
      { path: '/contacts', label: { ru: 'Контакты', en: 'Contacts' }, icon: 'contacts', permission: 'crm.contacts.view', },
      { path: '/organizations', label: { ru: 'Организации', en: 'Organizations' }, icon: 'business', permission: 'crm.organizations.view', },
      { path: '/partners', label: { ru: 'Партнёры', en: 'Partners' }, icon: 'handshake', permission: 'crm.partners.view', },
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
      { path: '/activity', label: { ru: 'Взаимодействия', en: 'Interactions' }, icon: 'forum', permission: 'crm.activity.view', },
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

/** Direct navigation respects the (prototype, client-side) permission matrix: no right → "Нет доступа". */
const guard = (permission: Permission, page: ReactNode) => <RequirePermission permission={permission}>{page}</RequirePermission>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell nav={NAV} />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: guard('crm.dashboard.view', <DashboardPage />) },
      { path: 'contacts', element: guard('crm.contacts.view', <ContactsPage />) },
      { path: 'contacts/new', element: guard('crm.contacts.edit', <ContactFormPage key="new" />) },
      { path: 'contacts/:id', element: guard('crm.contacts.view', <ContactDetailPage />) },
      { path: 'contacts/:id/edit', element: guard('crm.contacts.edit', <ContactFormPage />) },
      { path: 'organizations', element: guard('crm.organizations.view', <OrganizationsPage />) },
      { path: 'organizations/new', element: guard('crm.organizations.edit', <OrganizationFormPage key="new" />) },
      { path: 'organizations/:id', element: guard('crm.organizations.view', <OrganizationDetailPage />) },
      { path: 'organizations/:id/edit', element: guard('crm.organizations.edit', <OrganizationFormPage />) },
      { path: 'partners', element: guard('crm.partners.view', <PartnersPage />) },
      { path: 'activity', element: guard('crm.activity.view', <InteractionsPage />) },
      ...planned.map((section) => ({
        path: section.path.slice(1),
        element: guard(section.permission, <SectionPlaceholder section={section} />),
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
