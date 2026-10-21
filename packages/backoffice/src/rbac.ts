import type { AppId, Localized } from './domain.ts';

/**
 * Preliminary role-based access for the back-office prototypes. Roles and their permissions are DATA (a matrix), so
 * they can change without touching screens: `withOverrides` grants or revokes per role, and a future backend can
 * supply the matrix instead. This only shapes the UI of a local prototype — it is not security; real enforcement
 * belongs to the backend once authentication exists (OQ-07, OQ-54).
 */

export const ARM_PERMISSIONS = [
  'arm.dashboard.view',
  'arm.moderation.view',
  'arm.moderation.decide',
  'arm.catalog.view',
  'arm.catalog.edit',
  'arm.artists.view',
  'arm.artists.edit',
  'arm.users.view',
  'arm.users.edit',
  'arm.campaigns.view',
  'arm.campaigns.decide',
  'arm.payments.view',
  'arm.reports.view',
  'arm.activity.view',
  'arm.settings.manage',
] as const;

export const CRM_PERMISSIONS = [
  'crm.dashboard.view',
  'crm.contacts.view',
  'crm.contacts.edit',
  'crm.organizations.view',
  'crm.organizations.edit',
  'crm.partners.view',
  'crm.partners.edit',
  'crm.deals.view',
  'crm.deals.edit',
  'crm.tasks.view',
  'crm.tasks.edit',
  'crm.activity.view',
  'crm.activity.edit',
  'crm.reports.view',
  'crm.settings.manage',
] as const;

export type ArmPermission = (typeof ARM_PERMISSIONS)[number];
export type CrmPermission = (typeof CRM_PERMISSIONS)[number];
export type Permission = ArmPermission | CrmPermission;

export type RoleDefinition = {
  id: string;
  app: AppId;
  label: Localized;
  description: Localized;
  permissions: readonly Permission[];
  /** Approved as provisional (2026-10-21): names and rights may change. */
  provisional: true;
};

const view = (list: readonly Permission[]) => list.filter((p) => p.endsWith('.view'));

/** Provisional roles approved for M1 (docs/arm-crm-plan.md). */
export const DEFAULT_ROLES: readonly RoleDefinition[] = [
  {
    id: 'arm-super-admin',
    app: 'arm',
    label: { ru: 'Супер-админ', en: 'Super admin' },
    description: { ru: 'Полный доступ ко всем разделам АРМ', en: 'Full access to every ARM section' },
    permissions: ARM_PERMISSIONS,
    provisional: true,
  },
  {
    id: 'arm-moderator',
    app: 'arm',
    label: { ru: 'Модератор', en: 'Moderator' },
    description: { ru: 'Модерация треков и релизов, каталог, артисты', en: 'Track and release moderation, catalog, artists' },
    permissions: ['arm.dashboard.view', 'arm.moderation.view', 'arm.moderation.decide', 'arm.catalog.view', 'arm.catalog.edit', 'arm.artists.view', 'arm.activity.view'],
    provisional: true,
  },
  {
    id: 'arm-support',
    app: 'arm',
    label: { ru: 'Поддержка', en: 'Support' },
    description: { ru: 'Пользователи и артисты, история действий', en: 'Users and artists, activity history' },
    permissions: ['arm.dashboard.view', 'arm.users.view', 'arm.users.edit', 'arm.artists.view', 'arm.activity.view'],
    provisional: true,
  },
  {
    id: 'arm-finance',
    app: 'arm',
    label: { ru: 'Финансы', en: 'Finance' },
    description: { ru: 'Платежи и транзакции, кампании, отчёты (только просмотр)', en: 'Payments and transactions, campaigns, reports (view only)' },
    permissions: ['arm.dashboard.view', 'arm.payments.view', 'arm.campaigns.view', 'arm.reports.view'],
    provisional: true,
  },
  {
    id: 'arm-analyst',
    app: 'arm',
    label: { ru: 'Аналитик', en: 'Analyst' },
    description: { ru: 'Просмотр всех разделов без изменений', en: 'Every section, view only' },
    permissions: view(ARM_PERMISSIONS),
    provisional: true,
  },
  {
    id: 'crm-partnership-lead',
    app: 'crm',
    label: { ru: 'Руководитель партнёрств', en: 'Partnerships lead' },
    description: { ru: 'Полный доступ ко всем разделам CRM', en: 'Full access to every CRM section' },
    permissions: CRM_PERMISSIONS,
    provisional: true,
  },
  {
    id: 'crm-manager',
    app: 'crm',
    label: { ru: 'Менеджер (A&R / продажи)', en: 'Manager (A&R / sales)' },
    description: { ru: 'Контакты, компании, сделки, задачи, взаимодействия', en: 'Contacts, companies, deals, tasks, interactions' },
    permissions: CRM_PERMISSIONS.filter((p) => p !== 'crm.settings.manage'),
    provisional: true,
  },
  {
    id: 'crm-viewer',
    app: 'crm',
    label: { ru: 'Наблюдатель', en: 'Viewer' },
    description: { ru: 'Просмотр без изменений', en: 'View only' },
    permissions: view(CRM_PERMISSIONS),
    provisional: true,
  },
];

export type PermissionMatrix = Readonly<Record<string, ReadonlySet<Permission>>>;

export function buildMatrix(roles: readonly RoleDefinition[]): PermissionMatrix {
  return Object.fromEntries(roles.map((role) => [role.id, new Set(role.permissions)]));
}

/** Unknown roles have no permissions (fail closed). */
export function can(matrix: PermissionMatrix, roleId: string | undefined, permission: Permission): boolean {
  return !!roleId && !!matrix[roleId]?.has(permission);
}

export function rolesFor(app: AppId, roles: readonly RoleDefinition[] = DEFAULT_ROLES): RoleDefinition[] {
  return roles.filter((role) => role.app === app);
}

export type RoleOverrides = Partial<Record<string, { grant?: readonly Permission[]; revoke?: readonly Permission[] }>>;

/** The configurable half of the matrix: grant / revoke per role without editing the defaults. */
export function withOverrides(roles: readonly RoleDefinition[], overrides: RoleOverrides): RoleDefinition[] {
  return roles.map((role) => {
    const o = overrides[role.id];
    if (!o) return role;
    const next = new Set(role.permissions);
    o.grant?.forEach((p) => next.add(p));
    o.revoke?.forEach((p) => next.delete(p));
    return { ...role, permissions: [...next] };
  });
}

/** A role may only hold permissions of its own app (checked by the unit tests and at start-up in development). */
export function invalidPermissions(role: RoleDefinition): Permission[] {
  return role.permissions.filter((p) => !p.startsWith(`${role.app}.`));
}
