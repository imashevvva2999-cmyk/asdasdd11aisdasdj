import { createBrowserRouter, Navigate } from 'react-router';

import type { ActivityEvent, Localized } from '@mmusic/backoffice/domain';
import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { createBackoffice, useLocalized } from '@mmusic/backoffice/react';
import { AppShell, ComingSoonPage, NotFoundPage, RequirePermission, type NavGroup, type NavItem } from '@mmusic/backoffice/ui';

import { DashboardPage } from '@/pages/DashboardPage';

/** ARM's own back-office instance: storage namespace `mmusic-arm`, fictional demo data, provisional ARM roles. */
export const backoffice = createBackoffice({
  app: 'arm',
  appName: { ru: 'АРМ — администрирование', en: 'ARM — Administration' },
  namespace: 'mmusic-arm',
  dataVersion: 1,
  // M1: the activity log collection exists (empty); moderation, catalog, users… arrive with their milestones.
  seed: () => ({ activity: [] as ActivityEvent[] }),
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
      { path: '/moderation', label: { ru: 'Модерация', en: 'Moderation' }, icon: 'gavel', permission: 'arm.moderation.view', milestone: 'M2', description: { ru: 'Очередь треков и релизов: одобрить, отклонить, запросить правки.', en: 'Track and release queue: approve, reject, request changes.' } },
      { path: '/catalog', label: { ru: 'Каталог', en: 'Catalog' }, icon: 'library-music', permission: 'arm.catalog.view', milestone: 'M3', description: { ru: 'Артисты, альбомы, треки, жанры и редакционные плейлисты (FR-19.1).', en: 'Artists, albums, tracks, genres and editorial playlists (FR-19.1).' } },
    ],
  },
  {
    label: { ru: 'Люди', en: 'People' },
    sections: [
      { path: '/artists', label: { ru: 'Артисты', en: 'Artists' }, icon: 'mic', permission: 'arm.artists.view', milestone: 'M2', description: { ru: 'Профили артистов, статус верификации (OQ-49), релизы.', en: 'Artist profiles, verification status (OQ-49), releases.' } },
      { path: '/users', label: { ru: 'Пользователи', en: 'Users' }, icon: 'group', permission: 'arm.users.view', milestone: 'M2', description: { ru: 'Вымышленные пользователи с замаскированными данными.', en: 'Fictional users with masked personal data.' } },
    ],
  },
  {
    label: { ru: 'Бизнес', en: 'Business' },
    sections: [
      { path: '/campaigns', label: { ru: 'Кампании', en: 'Campaigns' }, icon: 'campaign', permission: 'arm.campaigns.view', milestone: 'M3', description: { ru: 'Проверка промо-кампаний «на модерации».', en: 'Review of promotion campaigns "in review".' } },
      { path: '/payments', label: { ru: 'Платежи', en: 'Payments' }, icon: 'payments', permission: 'arm.payments.view', milestone: 'M3', description: { ru: 'Только просмотр вымышленных транзакций; реальной обработки платежей нет.', en: 'View-only fictional transactions; no real payment processing.' } },
      { path: '/reports', label: { ru: 'Отчёты', en: 'Reports' }, icon: 'assessment', permission: 'arm.reports.view', milestone: 'M3' },
    ],
  },
  {
    label: { ru: 'Система', en: 'System' },
    sections: [
      { path: '/activity', label: { ru: 'Журнал действий', en: 'Activity log' }, icon: 'history', permission: 'arm.activity.view', milestone: 'M2' },
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell nav={NAV} />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <RequirePermission permission="arm.dashboard.view">
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
