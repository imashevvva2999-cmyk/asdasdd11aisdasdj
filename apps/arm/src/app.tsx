import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { createBackoffice } from '@mmusic/backoffice/react';
import { createSafeStorage } from '@mmusic/backoffice/storage';
import { NotFoundPage } from '@mmusic/backoffice/ui';

import { ArmGuard, ArmShell, type ArmNavGroup } from '@/access';
import { ARM_DATA_VERSION, migrateStoredArmData } from '@/domain/migrate';
import type { ArmPermission } from '@/domain/permissions';
import { armSeed } from '@/domain/seed';
import { ActivityPage } from '@/pages/ActivityPage';
import { ArtistDetailPage, ArtistsPage } from '@/pages/ArtistPages';
import { CampaignDetailPage, CampaignsPage } from '@/pages/CampaignPages';
import { CatalogPage } from '@/pages/CatalogPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ModerationDetailPage, ModerationListPage } from '@/pages/ModerationPages';
import { PaymentDetailPage, PaymentsPage } from '@/pages/PaymentPages';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StaffRolesPage } from '@/pages/StaffRolesPage';
import { UserDetailPage, UsersPage } from '@/pages/UserPages';

const storage = createSafeStorage();
// Documented upgrade (domain/migrate.ts): v4 → v5 keeps every saved M2 / M3 record and local decision; only the M6
// role matrix, staff roles and settings are added.
migrateStoredArmData(storage);

/** ARM's own back-office instance: storage namespace `mmusic-arm`, fictional demo data, provisional ARM roles. */
export const backoffice = createBackoffice({
  app: 'arm',
  appName: { ru: 'АРМ — администрирование', en: 'ARM — Administration' },
  namespace: 'mmusic-arm',
  // v2 (M2): fictional submissions, demo artist applications, demo users and their audit events.
  // v3: + the playable demo submission sub-demo-horizon (saved v2 data is re-seeded so it appears).
  // v4 (M3): + campaign requests and demo donations (collections campaigns, transactions).
  // v5 (M6): + roles, staffRoles, preferences — migrated from v4, not re-seeded.
  dataVersion: ARM_DATA_VERSION,
  seed: armSeed,
  staff: DEMO_STAFF,
  storage,
});

/** ARM sections (docs/arm-crm-plan.md §4); the sidebar and the routes follow the editable ARM matrix (M6). */
export const NAV: ArmNavGroup[] = [
  {
    label: { ru: 'Обзор', en: 'Overview' },
    items: [{ path: '/dashboard', label: { ru: 'Дашборд', en: 'Dashboard' }, icon: 'dashboard', permission: 'arm.dashboard.view' }],
  },
  {
    label: { ru: 'Контент', en: 'Content' },
    items: [
      { path: '/moderation', label: { ru: 'Модерация', en: 'Moderation' }, icon: 'gavel', permission: 'arm.moderation.view' },
      { path: '/catalog', label: { ru: 'Каталог', en: 'Catalog' }, icon: 'library-music', permission: 'arm.catalog.view' },
    ],
  },
  {
    label: { ru: 'Люди', en: 'People' },
    items: [
      { path: '/artists', label: { ru: 'Артисты', en: 'Artists' }, icon: 'mic', permission: 'arm.artists.view' },
      { path: '/users', label: { ru: 'Пользователи', en: 'Users' }, icon: 'group', permission: 'arm.users.view' },
    ],
  },
  {
    label: { ru: 'Бизнес', en: 'Business' },
    items: [
      { path: '/campaigns', label: { ru: 'Кампании', en: 'Campaigns' }, icon: 'campaign', permission: 'arm.campaigns.view' },
      { path: '/payments', label: { ru: 'Платежи', en: 'Payments' }, icon: 'payments', permission: 'arm.payments.view' },
      { path: '/reports', label: { ru: 'Отчёты', en: 'Reports' }, icon: 'assessment', permission: 'arm.reports.view' },
    ],
  },
  {
    label: { ru: 'Система', en: 'System' },
    items: [
      { path: '/activity', label: { ru: 'Журнал действий', en: 'Activity log' }, icon: 'history', permission: 'arm.activity.view' },
      { path: '/settings', label: { ru: 'Настройки', en: 'Settings' }, icon: 'tune', permission: 'arm.settings.manage' },
      { path: '/staff', label: { ru: 'Сотрудники и роли', en: 'Staff and roles' }, icon: 'admin-panel-settings', permission: 'arm.dashboard.view' },
    ],
  },
];

/** Direct navigation respects the (prototype, client-side) ARM matrix: no right → "Нет доступа". */
const guard = (permission: ArmPermission, page: ReactNode) => <ArmGuard permission={permission}>{page}</ArmGuard>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ArmShell nav={NAV} />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: guard('arm.dashboard.view', <DashboardPage />) },
      { path: 'moderation', element: <Navigate to="/moderation/tracks" replace /> },
      { path: 'moderation/tracks', element: guard('arm.moderation.view', <ModerationListPage key="track" kind="track" />) },
      { path: 'moderation/tracks/:id', element: guard('arm.moderation.view', <ModerationDetailPage kind="track" />) },
      { path: 'moderation/releases', element: guard('arm.moderation.view', <ModerationListPage key="release" kind="release" />) },
      { path: 'moderation/releases/:id', element: guard('arm.moderation.view', <ModerationDetailPage kind="release" />) },
      { path: 'artists', element: guard('arm.artists.view', <ArtistsPage />) },
      { path: 'artists/:id', element: guard('arm.artists.view', <ArtistDetailPage />) },
      { path: 'users', element: guard('arm.users.view', <UsersPage />) },
      { path: 'users/:id', element: guard('arm.users.view', <UserDetailPage />) },
      { path: 'catalog', element: guard('arm.catalog.view', <CatalogPage />) },
      { path: 'campaigns', element: guard('arm.campaigns.view', <CampaignsPage />) },
      { path: 'campaigns/:id', element: guard('arm.campaigns.view', <CampaignDetailPage />) },
      { path: 'payments', element: guard('arm.payments.view', <PaymentsPage />) },
      { path: 'payments/:id', element: guard('arm.payments.view', <PaymentDetailPage />) },
      { path: 'reports', element: guard('arm.reports.view', <ReportsPage />) },
      { path: 'activity', element: guard('arm.activity.view', <ActivityPage />) },
      { path: 'settings', element: guard('arm.settings.manage', <SettingsPage />) },
      // Every ARM role sees staff and roles read-only; changes need arm.roles.manage.
      { path: 'staff', element: guard('arm.dashboard.view', <StaffRolesPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Development-only audio preview test bench (not in production builds, not linked from the app).
  ...(import.meta.env.DEV
    ? [{ path: '/dev/audio-preview', HydrateFallback: () => null, lazy: async () => ({ Component: (await import('@/dev/AudioPreviewHarness')).AudioPreviewHarness }) }]
    : []),
]);
