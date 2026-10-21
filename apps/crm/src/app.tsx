import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import type { Localized } from '@mmusic/backoffice/domain';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { createBackoffice } from '@mmusic/backoffice/react';
import { createSafeStorage } from '@mmusic/backoffice/storage';
import { NotFoundPage } from '@mmusic/backoffice/ui';

import { CrmGuard, CrmShell, type CrmNavGroup, type CrmNavItem } from '@/access';
import { CRM_DATA_VERSION, migrateStoredCrmData } from '@/domain/migrate';
import type { CrmPermission } from '@/domain/permissions';
import { crmSeed } from '@/domain/seed';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ContactDetailPage, ContactFormPage, ContactsPage } from '@/pages/ContactPages';
import { DealDetailPage } from '@/pages/DealDetailPage';
import { DealFormPage } from '@/pages/DealFormPage';
import { DealsPage } from '@/pages/DealsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InteractionsPage } from '@/pages/InteractionsPage';
import { OrganizationDetailPage, OrganizationFormPage, OrganizationsPage } from '@/pages/OrganizationPages';
import { PartnersPage } from '@/pages/PartnersPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StaffRolesPage } from '@/pages/StaffRolesPage';
import { TaskDetailPage, TaskFormPage } from '@/pages/TaskPages';
import { TasksPage } from '@/pages/TasksPage';

const storage = createSafeStorage();
// Documented upgrades (domain/migrate.ts): v2 → v3 → v4 keep every saved record and local edit; only new
// collections (M5 deals and tasks, M6 settings and roles) are added.
migrateStoredCrmData(storage);

/** CRM's own back-office instance: storage namespace `mmusic-crm`, fictional contacts and companies, provisional CRM roles. */
export const backoffice = createBackoffice({
  app: 'crm',
  appName: { ru: 'CRM — отношения', en: 'CRM — Relationships' },
  namespace: 'mmusic-crm',
  // v2 (M4): contact status, organization relationship, interactions; saved v1 data is re-seeded.
  // v3 (M5): + deals and tasks; v4 (M6): + pipeline, tags, preferences, roles, staff roles — migrated, not re-seeded.
  dataVersion: CRM_DATA_VERSION,
  seed: crmSeed,
  staff: DEMO_STAFF,
  storage,
});

/** CRM sections (docs/arm-crm-plan.md §4); each item is shown only to roles whose CRM matrix has its permission. */
const GROUPS: { label: Localized; sections: CrmNavItem[] }[] = [
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
      { path: '/deals', label: { ru: 'Сделки', en: 'Deals' }, icon: 'view-kanban', permission: 'crm.deals.view', },
      { path: '/tasks', label: { ru: 'Задачи', en: 'Tasks' }, icon: 'task-alt', permission: 'crm.tasks.view', },
    ],
  },
  {
    label: { ru: 'Активность', en: 'Activity' },
    sections: [
      { path: '/activity', label: { ru: 'Взаимодействия', en: 'Interactions' }, icon: 'forum', permission: 'crm.activity.view', },
      { path: '/reports', label: { ru: 'Аналитика', en: 'Analytics' }, icon: 'insights', permission: 'crm.reports.view', },
    ],
  },
  {
    label: { ru: 'Система', en: 'System' },
    sections: [
      { path: '/settings', label: { ru: 'Настройки', en: 'Settings' }, icon: 'tune', permission: 'crm.settings.manage' },
      { path: '/staff', label: { ru: 'Сотрудники и роли', en: 'Staff and roles' }, icon: 'admin-panel-settings', permission: 'crm.dashboard.view' },
    ],
  },
];

export const NAV: CrmNavGroup[] = GROUPS.map((g) => ({ label: g.label, items: g.sections }));

/** Every route asks the CRM matrix (prototype, browser-local): no right → "Нет доступа", whatever the URL. */
const guard = (permission: CrmPermission, page: ReactNode) => <CrmGuard permission={permission}>{page}</CrmGuard>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <CrmShell nav={NAV} />,
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
      { path: 'deals', element: guard('crm.deals.view', <DealsPage />) },
      { path: 'deals/new', element: guard('crm.deals.edit', <DealFormPage key="new" />) },
      { path: 'deals/:id', element: guard('crm.deals.view', <DealDetailPage />) },
      { path: 'deals/:id/edit', element: guard('crm.deals.edit', <DealFormPage />) },
      { path: 'tasks', element: guard('crm.tasks.view', <TasksPage />) },
      { path: 'tasks/new', element: guard('crm.tasks.edit', <TaskFormPage key="new" />) },
      { path: 'tasks/:id', element: guard('crm.tasks.view', <TaskDetailPage />) },
      { path: 'tasks/:id/edit', element: guard('crm.tasks.edit', <TaskFormPage />) },
      { path: 'reports', element: guard('crm.reports.view', <AnalyticsPage />) },
      { path: 'settings', element: guard('crm.settings.manage', <SettingsPage />) },
      { path: 'staff', element: guard('crm.dashboard.view', <StaffRolesPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
