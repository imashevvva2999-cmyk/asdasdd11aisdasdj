import type { ActivityEvent, Localized } from '@mmusic/backoffice/domain';
import { rolesFor, type ArmPermission as SharedArmPermission, type PermissionMatrix } from '@mmusic/backoffice/rbac';
import { auditEvent, type Actor, type DecisionContext } from '@mmusic/backoffice/review';

import type { RoleConfig, StaffAssignment } from './types.ts';

/**
 * ARM permissions (M6). An ARM-local catalogue on top of the shared back-office `arm.*` rights plus one right the
 * shared list does not have: staff and role management (`arm.roles.manage`, split from `arm.settings.manage`).
 * Kept apart from the CRM matrix. The matrix is editable demo data in this browser — it shapes a local prototype and
 * is NOT access control or authentication. Real enforcement belongs to a future backend (OQ-56, OQ-57).
 */

export const ARM_ROLE_IDS = ['arm-super-admin', 'arm-moderator', 'arm-support', 'arm-finance', 'arm-analyst'] as const;
export type ArmRoleId = (typeof ARM_ROLE_IDS)[number];
export const SUPER_ADMIN: ArmRoleId = 'arm-super-admin';
/** Roles that only view (their descriptions say so): their decision and management rights stay off. */
export const READ_ONLY_ROLES: readonly string[] = ['arm-finance', 'arm-analyst'];

export type ArmPermission = SharedArmPermission | 'arm.roles.manage';

type Item = { key: ArmPermission; label: Localized; requires?: ArmPermission; sensitive?: true };

/** Matrix rows, grouped for the roles screen; `requires` = the right this one depends on; `sensitive` = a decision right. */
export const PERMISSION_GROUPS: { id: string; label: Localized; items: Item[] }[] = [
  { id: 'overview', label: { ru: 'Обзор', en: 'Overview' }, items: [{ key: 'arm.dashboard.view', label: { ru: 'Дашборд (всегда доступен)', en: 'Dashboard (always on)' } }] },
  {
    id: 'moderation',
    label: { ru: 'Модерация треков и релизов', en: 'Track and release moderation' },
    items: [
      { key: 'arm.moderation.view', label: { ru: 'Просмотр очереди модерации', en: 'View the moderation queue' } },
      { key: 'arm.moderation.decide', label: { ru: 'Одобрение, отклонение и запрос правок контента', en: 'Approve, reject and request changes to content' }, requires: 'arm.moderation.view', sensitive: true },
    ],
  },
  {
    id: 'artists',
    label: { ru: 'Заявки и верификация артистов', en: 'Artist applications and verification' },
    items: [
      { key: 'arm.artists.view', label: { ru: 'Просмотр артистов и заявок', en: 'View artists and applications' } },
      { key: 'arm.artists.edit', label: { ru: 'Верификация артистов: подтверждение, отклонение, запрос правок', en: 'Verify artists: confirm, reject, request changes' }, requires: 'arm.artists.view', sensitive: true },
    ],
  },
  {
    id: 'users',
    label: { ru: 'Пользователи и ограничения', en: 'Users and restrictions' },
    items: [
      { key: 'arm.users.view', label: { ru: 'Просмотр пользователей', en: 'View users' } },
      { key: 'arm.users.edit', label: { ru: 'Блокировка и восстановление пользователей', en: 'Suspend and reactivate users' }, requires: 'arm.users.view', sensitive: true },
    ],
  },
  {
    id: 'catalog',
    label: { ru: 'Каталог и демо-размещения', en: 'Catalog and demo listings' },
    items: [
      { key: 'arm.catalog.view', label: { ru: 'Просмотр каталога и демо-размещений', en: 'View the catalog and demo listings' } },
      { key: 'arm.catalog.edit', label: { ru: 'Снятие с витрины и возврат демо-размещений', en: 'Unlist and relist demo listings' }, requires: 'arm.catalog.view', sensitive: true },
    ],
  },
  {
    id: 'campaigns',
    label: { ru: 'Кампании продвижения', en: 'Promotion campaigns' },
    items: [
      { key: 'arm.campaigns.view', label: { ru: 'Просмотр заявок на кампании', en: 'View campaign requests' } },
      { key: 'arm.campaigns.decide', label: { ru: 'Решения по кампаниям: одобрение, отклонение, запрос правок', en: 'Campaign decisions: approve, reject, request changes' }, requires: 'arm.campaigns.view', sensitive: true },
    ],
  },
  {
    id: 'finance',
    label: { ru: 'Платежи и отчёты', en: 'Payments and reports' },
    items: [
      { key: 'arm.payments.view', label: { ru: 'Обзор платежей (только просмотр)', en: 'Payments overview (view only)' } },
      { key: 'arm.reports.view', label: { ru: 'Отчёты и аналитика', en: 'Reports and analytics' } },
    ],
  },
  { id: 'audit', label: { ru: 'Журнал', en: 'Audit' }, items: [{ key: 'arm.activity.view', label: { ru: 'Журнал действий', en: 'Activity log' } }] },
  {
    id: 'admin',
    label: { ru: 'Настройки и роли', en: 'Settings and roles' },
    items: [
      { key: 'arm.settings.manage', label: { ru: 'Настройки АРМ: фильтры очередей, отображение, демо-процессы', en: 'ARM settings: queue filters, display, demo workflow' }, sensitive: true },
      { key: 'arm.roles.manage', label: { ru: 'Сотрудники, роли и матрица прав', en: 'Staff, roles and permission matrix' }, sensitive: true },
    ],
  },
];

export const ARM_PERMISSION_KEYS: readonly ArmPermission[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));
const REQUIRES = new Map(PERMISSION_GROUPS.flatMap((g) => g.items.filter((i) => i.requires).map((i) => [i.key, i.requires!] as const)));
export const isViewPermission = (p: ArmPermission) => p.endsWith('.view');

/**
 * Default matrix = the provisional ARM roles approved in M1 (unchanged), plus `arm.roles.manage` for the super admin
 * only — before M6 the staff-and-roles section was the super admin's (arm.settings.manage).
 */
function defaultsOf(id: ArmRoleId): readonly ArmPermission[] {
  const shared = new Set<string>(rolesFor('arm').find((r) => r.id === id)?.permissions ?? []);
  if (id === SUPER_ADMIN) shared.add('arm.roles.manage');
  return ARM_PERMISSION_KEYS.filter((p) => shared.has(p));
}

export const DEFAULT_ROLE_PERMISSIONS: Record<ArmRoleId, readonly ArmPermission[]> = {
  'arm-super-admin': defaultsOf('arm-super-admin'),
  'arm-moderator': defaultsOf('arm-moderator'),
  'arm-support': defaultsOf('arm-support'),
  'arm-finance': defaultsOf('arm-finance'),
  'arm-analyst': defaultsOf('arm-analyst'),
};

export function defaultRoleConfigs(): RoleConfig[] {
  return ARM_ROLE_IDS.map((id) => ({ id, mock: true, permissions: [...DEFAULT_ROLE_PERMISSIONS[id]] }));
}

export type ArmMatrix = Readonly<Record<string, ReadonlySet<string>>>;

export function buildArmMatrix(configs: readonly RoleConfig[]): ArmMatrix {
  return Object.fromEntries(configs.map((c) => [c.id, new Set(c.permissions)]));
}

/** Unknown roles have no rights (fail closed). */
export function armCan(matrix: ArmMatrix, roleId: string | undefined, permission: ArmPermission): boolean {
  return !!roleId && !!matrix[roleId]?.has(permission);
}

/** Context of an ARM action: the ARM matrix, the acting demo staff member and the time. */
export type ArmContext = { matrix: ArmMatrix; actor: Actor; now: string };
export type Audit = Omit<ActivityEvent, 'id' | 'mock'>;

/** The same context for the shared review rules (decide / can), which check the shared `arm.*` rights of this matrix. */
export const decisionContext = (ctx: ArmContext): DecisionContext => ({ matrix: ctx.matrix as PermissionMatrix, actor: ctx.actor, now: ctx.now });
export const audit = (input: Parameters<typeof auditEvent>[0], ctx: ArmContext): Audit => auditEvent(input, { matrix: {}, actor: ctx.actor, now: ctx.now });
const canManageRoles = (ctx: ArmContext) => armCan(ctx.matrix, ctx.actor.roleId, 'arm.roles.manage');

export type LockReason = 'always' | 'read-only-role' | 'super-keeps-roles';

/**
 * Why a cell of the matrix cannot change: dashboard always on; finance and analyst stay view-only; the super admin
 * keeps role management (no lock-out). Undefined = editable.
 */
export function lockReason(roleId: string, permission: ArmPermission): LockReason | undefined {
  if (permission === 'arm.dashboard.view') return 'always';
  if (READ_ONLY_ROLES.includes(roleId) && !isViewPermission(permission)) return 'read-only-role';
  if (roleId === SUPER_ADMIN && permission === 'arm.roles.manage') return 'super-keeps-roles';
  return undefined;
}

/** Applies one toggle with its dependencies: granting adds what it requires; revoking removes what depends on it. */
export function toggle(set: ReadonlySet<string>, permission: ArmPermission, on: boolean): Set<string> {
  const next = new Set(set);
  if (on) {
    for (let p: ArmPermission | undefined = permission; p; p = REQUIRES.get(p)) next.add(p);
    return next;
  }
  next.delete(permission);
  for (const [p, req] of REQUIRES) if (!next.has(req)) next.delete(p);
  return next;
}

export type RoleChange = { roleId: string; permission: ArmPermission; on: boolean };
export type RoleError = 'forbidden' | 'locked' | 'unknown-role' | 'same-status' | 'last-super-admin';

/**
 * Saves edited role rights (permission arm.roles.manage): every changed cell is checked against the locks, the
 * dependencies are applied, and one audit event per granted / revoked right is written.
 */
export function applyRoleChanges(configs: readonly RoleConfig[], changes: readonly RoleChange[], ctx: ArmContext): { ok: true; patches: { id: string; permissions: string[] }[]; events: Audit[] } | { ok: false; error: RoleError } {
  if (!canManageRoles(ctx)) return { ok: false, error: 'forbidden' };
  const sets = new Map(configs.map((c) => [c.id, new Set(c.permissions)]));
  for (const c of changes) {
    const set = sets.get(c.roleId);
    if (!set || !ARM_PERMISSION_KEYS.includes(c.permission)) return { ok: false, error: 'unknown-role' };
    if (lockReason(c.roleId, c.permission)) return { ok: false, error: 'locked' };
    sets.set(c.roleId, toggle(set, c.permission, c.on));
  }
  const patches: { id: string; permissions: string[] }[] = [];
  const events: Audit[] = [];
  for (const config of configs) {
    const before = new Set(config.permissions);
    const after = sets.get(config.id)!;
    const granted = ARM_PERMISSION_KEYS.filter((p) => after.has(p) && !before.has(p));
    const revoked = ARM_PERMISSION_KEYS.filter((p) => before.has(p) && !after.has(p));
    if (granted.length === 0 && revoked.length === 0) continue;
    patches.push({ id: config.id, permissions: ARM_PERMISSION_KEYS.filter((p) => after.has(p)) });
    for (const p of granted) events.push(audit({ action: 'role.grant', entity: { type: 'role', id: config.id, label: config.id }, reason: p }, ctx));
    for (const p of revoked) events.push(audit({ action: 'role.revoke', entity: { type: 'role', id: config.id, label: config.id }, reason: p }, ctx));
  }
  if (patches.length === 0) return { ok: false, error: 'same-status' };
  return { ok: true, patches, events };
}

/** Restores one role's default rights (permission arm.roles.manage). */
export function resetRole(config: RoleConfig, ctx: ArmContext): { ok: true; patch: { permissions: string[] }; event: Audit } | { ok: false; error: RoleError } {
  if (!canManageRoles(ctx)) return { ok: false, error: 'forbidden' };
  const defaults = DEFAULT_ROLE_PERMISSIONS[config.id as ArmRoleId];
  if (!defaults) return { ok: false, error: 'unknown-role' };
  if (defaults.length === config.permissions.length && defaults.every((p) => config.permissions.includes(p))) return { ok: false, error: 'same-status' };
  return { ok: true, patch: { permissions: [...defaults] }, event: audit({ action: 'role.reset', entity: { type: 'role', id: config.id, label: config.id } }, ctx) };
}

/** Demo role assignment of a staff member (arm.roles.manage); at least one staff member keeps the super admin role. */
export function assignStaffRole(staffId: string, staffName: string, roleId: string, assignments: readonly StaffAssignment[], ctx: ArmContext): { ok: true; patch: { roleId: string }; event: Audit } | { ok: false; error: RoleError } {
  if (!canManageRoles(ctx)) return { ok: false, error: 'forbidden' };
  if (!(ARM_ROLE_IDS as readonly string[]).includes(roleId)) return { ok: false, error: 'unknown-role' };
  const current = assignments.find((a) => a.id === staffId);
  if (!current) return { ok: false, error: 'unknown-role' };
  if (current.roleId === roleId) return { ok: false, error: 'same-status' };
  if (current.roleId === SUPER_ADMIN && assignments.filter((a) => a.roleId === SUPER_ADMIN).length === 1) return { ok: false, error: 'last-super-admin' };
  return { ok: true, patch: { roleId }, event: audit({ action: 'staff.role', entity: { type: 'staff', id: staffId, label: staffName }, fromStatus: current.roleId, toStatus: roleId }, ctx) };
}
