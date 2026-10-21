import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import type { Localized } from '@mmusic/backoffice/domain';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import type { Permission } from '@mmusic/backoffice/rbac';
import { createBackoffice, useLocalized } from '@mmusic/backoffice/react';
import { AppShell, ComingSoonPage, NotFoundPage, RequirePermission, type NavGroup, type NavItem } from '@mmusic/backoffice/ui';

import { armSeed } from '@/domain/seed';
import { ActivityPage } from '@/pages/ActivityPage';
import { ArtistDetailPage, ArtistsPage } from '@/pages/ArtistPages';
import { CampaignDetailPage, CampaignsPage } from '@/pages/CampaignPages';
import { CatalogPage } from '@/pages/CatalogPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ModerationDetailPage, ModerationListPage } from '@/pages/ModerationPages';
import { PaymentDetailPage, PaymentsPage } from '@/pages/PaymentPages';
import { ReportsPage } from '@/pages/ReportsPage';
import { UserDetailPage, UsersPage } from '@/pages/UserPages';

/** ARM's own back-office instance: storage namespace `mmusic-arm`, fictional demo data, provisional ARM roles. */
export const backoffice = createBackoffice({
  app: 'arm',
  appName: { ru: 'АРМ — администрирование', en: 'ARM — Administration' },
  namespace: 'mmusic-arm',
  // v2 (M2): fictional submissions, demo artist applications, demo users and their audit events.
  // v3: + the playable demo submission sub-demo-horizon (saved v2 data is re-seeded so it appears).
  // v4 (M3): + campaign requests and demo donations (collections campaigns, transactions).
  dataVersion: 4,
  seed: armSeed,
  staff: DEMO_STAFF,
});

type Section = NavItem & { milestone?: string; description?: Localized };

/** ARM sections (docs/arm-crm-plan.md §4). `milestone`: built in that milestone; until then an honest placeholder. */
const GROUPS: { label: Localized; sections: Section[] }[] = [
  {
    label: { ru: 'Обзор', en: 'Overview' },
    sections: [{ path: '/dashboard', label: { ru: 'Дашборд', en: 'Dashboard' }, icon: 'dashboard', permission: 'arm.dashboard.view' }],
  },
  {
    label: { ru: 'Контент', en: 'Content' },
    sections: [
      { path: '/moderation', label: { ru: 'Модерация', en: 'Moderation' }, icon: 'gavel', permission: 'arm.moderation.view' },
      { path: '/catalog', label: { ru: 'Каталог', en: 'Catalog' }, icon: 'library-music', permission: 'arm.catalog.view', },
    ],
  },
  {
    label: { ru: 'Люди', en: 'People' },
    sections: [
      { path: '/artists', label: { ru: 'Артисты', en: 'Artists' }, icon: 'mic', permission: 'arm.artists.view' },
      { path: '/users', label: { ru: 'Пользователи', en: 'Users' }, icon: 'group', permission: 'arm.users.view' },
    ],
  },
  {
    label: { ru: 'Бизнес', en: 'Business' },
    sections: [
      { path: '/campaigns', label: { ru: 'Кампании', en: 'Campaigns' }, icon: 'campaign', permission: 'arm.campaigns.view', },
      { path: '/payments', label: { ru: 'Платежи', en: 'Payments' }, icon: 'payments', permission: 'arm.payments.view', },
      { path: '/reports', label: { ru: 'Отчёты', en: 'Reports' }, icon: 'assessment', permission: 'arm.reports.view', },
    ],
  },
  {
    label: { ru: 'Система', en: 'System' },
    sections: [
      { path: '/activity', label: { ru: 'Журнал действий', en: 'Activity log' }, icon: 'history', permission: 'arm.activity.view' },
      { path: '/settings', label: { ru: 'Сотрудники и роли', en: 'Staff and roles' }, icon: 'admin-panel-settings', permission: 'arm.settings.manage', milestone: 'M6', description: { ru: 'Матрица ролей и прав (сейчас — предварительная, настраивается в коде).', en: 'Role and permission matrix (provisional for now, configured in code).' } },
    ],
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
      { path: 'dashboard', element: guard('arm.dashboard.view', <DashboardPage />) },
      { path: 'moderation', element: <Navigate to="/moderation/tracks" replace /> },
      { path: 'moderation/tracks', element: guard('arm.moderation.view', <ModerationListPage kind="track" />) },
      { path: 'moderation/tracks/:id', element: guard('arm.moderation.view', <ModerationDetailPage kind="track" />) },
      { path: 'moderation/releases', element: guard('arm.moderation.view', <ModerationListPage kind="release" />) },
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
      ...planned.map((section) => ({
        path: section.path.slice(1),
        element: guard(section.permission, <SectionPlaceholder section={section} />),
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Development-only audio preview test bench (not in production builds, not linked from the app).
  ...(import.meta.env.DEV
    ? [{ path: '/dev/audio-preview', HydrateFallback: () => null, lazy: async () => ({ Component: (await import('@/dev/AudioPreviewHarness')).AudioPreviewHarness }) }]
    : []),
]);
