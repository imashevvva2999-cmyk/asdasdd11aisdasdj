import type { ActivityEvent, Localized } from '@mmusic/backoffice/domain';
import { auditEvent, type Actor } from '@mmusic/backoffice/review';

import type { RoleConfig, StaffAssignment } from './types.ts';

/**
 * CRM permissions (M6). A CRM-local catalogue on top of the shared back-office `crm.*` rights, plus two rights the
 * shared list does not have: closing deals (`crm.deals.close`) and staff / role management (`crm.roles.manage`).
 * The matrix is editable demo data in this browser — it shapes a local prototype and is NOT access control or
 * authentication. Real enforcement belongs to a future backend (OQ-56, OQ-57).
 */

export const CRM_ROLE_IDS = ['crm-partnership-lead', 'crm-manager', 'crm-viewer'] as const;
export type CrmRoleId = (typeof CRM_ROLE_IDS)[number];
export const LEAD: CrmRoleId = 'crm-partnership-lead';
export const VIEWER: CrmRoleId = 'crm-viewer';

export type CrmPermission =
  | 'crm.dashboard.view'
  | 'crm.contacts.view'
  | 'crm.contacts.edit'
  | 'crm.organizations.view'
  | 'crm.organizations.edit'
  | 'crm.partners.view'
  | 'crm.partners.edit'
  | 'crm.activity.view'
  | 'crm.activity.edit'
  | 'crm.deals.view'
  | 'crm.deals.edit'
  | 'crm.deals.close'
  | 'crm.tasks.view'
  | 'crm.tasks.edit'
  | 'crm.reports.view'
  | 'crm.settings.manage'
  | 'crm.roles.manage';

/** Matrix rows, grouped for the roles screen; `requires` = the right this one depends on. */
export const PERMISSION_GROUPS: { id: string; label: Localized; items: { key: CrmPermission; label: Localized; requires?: CrmPermission }[] }[] = [
  { id: 'overview', label: { ru: 'Обзор', en: 'Overview' }, items: [{ key: 'crm.dashboard.view', label: { ru: 'Дашборд (всегда доступен)', en: 'Dashboard (always on)' } }] },
  {
    id: 'relations',
    label: { ru: 'Контакты и организации', en: 'Contacts and organizations' },
    items: [
      { key: 'crm.contacts.view', label: { ru: 'Просмотр контактов', en: 'View contacts' } },
      { key: 'crm.contacts.edit', label: { ru: 'Создание и правка контактов, привязка к организациям', en: 'Create and edit contacts, link to organizations' }, requires: 'crm.contacts.view' },
      { key: 'crm.organizations.view', label: { ru: 'Просмотр организаций', en: 'View organizations' } },
      { key: 'crm.organizations.edit', label: { ru: 'Создание и правка организаций', en: 'Create and edit organizations' }, requires: 'crm.organizations.view' },
    ],
  },
  {
    id: 'partners',
    label: { ru: 'Партнёрские отношения', en: 'Partner relationships' },
    items: [
      { key: 'crm.partners.view', label: { ru: 'Просмотр партнёров', en: 'View partners' } },
      { key: 'crm.partners.edit', label: { ru: 'Смена статуса отношений', en: 'Change relationship status' }, requires: 'crm.partners.view' },
    ],
  },
  {
    id: 'activity',
    label: { ru: 'Взаимодействия и заметки', en: 'Interactions and notes' },
    items: [
      { key: 'crm.activity.view', label: { ru: 'Просмотр взаимодействий', en: 'View interactions' } },
      { key: 'crm.activity.edit', label: { ru: 'Запись взаимодействий и заметок, отметка напоминаний', en: 'Log interactions and notes, mark reminders done' }, requires: 'crm.activity.view' },
    ],
  },
  {
    id: 'deals',
    label: { ru: 'Сделки и воронка', en: 'Deals and pipeline' },
    items: [
      { key: 'crm.deals.view', label: { ru: 'Просмотр сделок', en: 'View deals' } },
      { key: 'crm.deals.edit', label: { ru: 'Создание и правка сделок, переходы между открытыми этапами', en: 'Create and edit deals, move between open stages' }, requires: 'crm.deals.view' },
      { key: 'crm.deals.close', label: { ru: 'Отметка «выиграна» / «проиграна» и возврат в работу', en: 'Mark won / lost and reopen' }, requires: 'crm.deals.edit' },
    ],
  },
  {
    id: 'tasks',
    label: { ru: 'Задачи и напоминания', en: 'Tasks and reminders' },
    items: [
      { key: 'crm.tasks.view', label: { ru: 'Просмотр задач', en: 'View tasks' } },
      { key: 'crm.tasks.edit', label: { ru: 'Создание, правка, назначение и выполнение задач', en: 'Create, edit, assign and complete tasks' }, requires: 'crm.tasks.view' },
    ],
  },
  { id: 'reports', label: { ru: 'Аналитика', en: 'Analytics' }, items: [{ key: 'crm.reports.view', label: { ru: 'Просмотр аналитики', en: 'View analytics' } }] },
  {
    id: 'admin',
    label: { ru: 'Настройки и роли', en: 'Settings and roles' },
    items: [
      { key: 'crm.settings.manage', label: { ru: 'Настройки CRM: воронка, теги, предпочтения', en: 'CRM settings: pipeline, tags, preferences' } },
      { key: 'crm.roles.manage', label: { ru: 'Сотрудники, роли и матрица прав', en: 'Staff, roles and permission matrix' } },
    ],
  },
];

export const CRM_PERMISSION_KEYS: readonly CrmPermission[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));
const REQUIRES = new Map(PERMISSION_GROUPS.flatMap((g) => g.items.filter((i) => i.requires).map((i) => [i.key, i.requires!] as const)));
export const isViewPermission = (p: CrmPermission) => p.endsWith('.view');

/**
 * Default matrix [П, conservative]: the lead has everything; the manager works with records but neither closes deals
 * (`crm.deals.close` — a distinct right since M6) nor changes settings or roles; the viewer only views.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<CrmRoleId, readonly CrmPermission[]> = {
  'crm-partnership-lead': CRM_PERMISSION_KEYS,
  'crm-manager': CRM_PERMISSION_KEYS.filter((p) => p !== 'crm.deals.close' && p !== 'crm.settings.manage' && p !== 'crm.roles.manage'),
  'crm-viewer': CRM_PERMISSION_KEYS.filter(isViewPermission),
};

export function defaultRoleConfigs(): RoleConfig[] {
  return CRM_ROLE_IDS.map((id) => ({ id, mock: true, permissions: [...DEFAULT_ROLE_PERMISSIONS[id]] }));
}

export type CrmMatrix = Readonly<Record<string, ReadonlySet<string>>>;

export function buildCrmMatrix(configs: readonly RoleConfig[]): CrmMatrix {
  return Object.fromEntries(configs.map((c) => [c.id, new Set(c.permissions)]));
}

/** Unknown roles have no rights (fail closed). */
export function crmCan(matrix: CrmMatrix, roleId: string | undefined, permission: CrmPermission): boolean {
  return !!roleId && !!matrix[roleId]?.has(permission);
}

/** Context of a CRM action: the CRM matrix, the acting demo staff member and the time. */
export type CrmContext = { matrix: CrmMatrix; actor: Actor; now: string };
export type Audit = Omit<ActivityEvent, 'id' | 'mock'>;
export const audit = (input: Parameters<typeof auditEvent>[0], ctx: CrmContext): Audit => auditEvent(input, { matrix: {}, actor: ctx.actor, now: ctx.now });
const canManageRoles = (ctx: CrmContext) => crmCan(ctx.matrix, ctx.actor.roleId, 'crm.roles.manage');

/**
 * Why a cell of the matrix cannot change: dashboard always on; the viewer stays read-only; the lead keeps role
 * management (no lock-out). Undefined = editable.
 */
export function lockReason(roleId: string, permission: CrmPermission): 'always' | 'viewer-read-only' | 'lead-keeps-roles' | undefined {
  if (permission === 'crm.dashboard.view') return 'always';
  if (roleId === VIEWER && !isViewPermission(permission)) return 'viewer-read-only';
  if (roleId === LEAD && permission === 'crm.roles.manage') return 'lead-keeps-roles';
  return undefined;
}

/** Applies one toggle with its dependencies: granting adds what it requires; revoking removes what depends on it. */
export function toggle(set: ReadonlySet<string>, permission: CrmPermission, on: boolean): Set<string> {
  const next = new Set(set);
  if (on) {
    for (let p: CrmPermission | undefined = permission; p; p = REQUIRES.get(p)) next.add(p);
    return next;
  }
  next.delete(permission);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [p, req] of REQUIRES) {
      if (next.has(p) && !next.has(req)) {
        next.delete(p);
        changed = true;
      }
    }
  }
  return next;
}

export type RoleChange = { roleId: string; permission: CrmPermission; on: boolean };
export type RoleError = 'forbidden' | 'locked' | 'unknown-role' | 'same-status' | 'last-lead';

/**
 * Saves edited role rights (permission crm.roles.manage): every changed cell is checked against the locks, the
 * dependencies are applied, and one audit event per granted / revoked right is written.
 */
export function applyRoleChanges(configs: readonly RoleConfig[], changes: readonly RoleChange[], ctx: CrmContext): { ok: true; patches: { id: string; permissions: string[] }[]; events: Audit[] } | { ok: false; error: RoleError } {
  if (!canManageRoles(ctx)) return { ok: false, error: 'forbidden' };
  const sets = new Map(configs.map((c) => [c.id, new Set(c.permissions)]));
  for (const c of changes) {
    const set = sets.get(c.roleId);
    if (!set) return { ok: false, error: 'unknown-role' };
    if (lockReason(c.roleId, c.permission)) return { ok: false, error: 'locked' };
    sets.set(c.roleId, toggle(set, c.permission, c.on));
  }
  const patches: { id: string; permissions: string[] }[] = [];
  const events: Audit[] = [];
  for (const config of configs) {
    const before = new Set(config.permissions);
    const after = sets.get(config.id)!;
    const granted = CRM_PERMISSION_KEYS.filter((p) => after.has(p) && !before.has(p));
    const revoked = CRM_PERMISSION_KEYS.filter((p) => before.has(p) && !after.has(p));
    if (granted.length === 0 && revoked.length === 0) continue;
    patches.push({ id: config.id, permissions: CRM_PERMISSION_KEYS.filter((p) => after.has(p)) });
    for (const p of granted) events.push(audit({ action: 'role.grant', entity: { type: 'role', id: config.id, label: config.id }, reason: p }, ctx));
    for (const p of revoked) events.push(audit({ action: 'role.revoke', entity: { type: 'role', id: config.id, label: config.id }, reason: p }, ctx));
  }
  if (patches.length === 0) return { ok: false, error: 'same-status' };
  return { ok: true, patches, events };
}

/** Restores one role's default rights (permission crm.roles.manage). */
export function resetRole(config: RoleConfig, ctx: CrmContext): { ok: true; patch: { permissions: string[] }; event: Audit } | { ok: false; error: RoleError } {
  if (!canManageRoles(ctx)) return { ok: false, error: 'forbidden' };
  const defaults = DEFAULT_ROLE_PERMISSIONS[config.id as CrmRoleId];
  if (!defaults) return { ok: false, error: 'unknown-role' };
  if (defaults.length === config.permissions.length && defaults.every((p) => config.permissions.includes(p))) return { ok: false, error: 'same-status' };
  return { ok: true, patch: { permissions: [...defaults] }, event: audit({ action: 'role.reset', entity: { type: 'role', id: config.id, label: config.id } }, ctx) };
}

/** Demo role assignment of a staff member (crm.roles.manage); at least one staff member keeps the lead role. */
export function assignStaffRole(staffId: string, staffName: string, roleId: string, assignments: readonly StaffAssignment[], ctx: CrmContext): { ok: true; patch: { roleId: string }; event: Audit } | { ok: false; error: RoleError } {
  if (!canManageRoles(ctx)) return { ok: false, error: 'forbidden' };
  if (!(CRM_ROLE_IDS as readonly string[]).includes(roleId)) return { ok: false, error: 'unknown-role' };
  const current = assignments.find((a) => a.id === staffId);
  if (!current) return { ok: false, error: 'unknown-role' };
  if (current.roleId === roleId) return { ok: false, error: 'same-status' };
  if (current.roleId === LEAD && assignments.filter((a) => a.roleId === LEAD).length === 1) return { ok: false, error: 'last-lead' };
  return { ok: true, patch: { roleId }, event: audit({ action: 'staff.role', entity: { type: 'staff', id: staffId, label: staffName }, fromStatus: current.roleId, toStatus: roleId }, ctx) };
}
