import { DEMO_STAFF } from '@mmusic/backoffice/mocks';
import { REVIEW_STATUSES } from '@mmusic/backoffice/review';

import { armCan, audit, defaultRoleConfigs, type ArmContext, type Audit } from './permissions.ts';
import { CATALOG_TABS, type ArmPreferences, type RoleConfig, type StaffAssignment } from './types.ts';

/**
 * ARM settings (M6): frontend-only preferences of this browser — default queue filters, display options and one
 * clearly labelled demo workflow option. No security, payment or backend configuration lives here.
 */

export const PREFERENCES_ID = 'prefs';
/** How many recent audit events the dashboard lists. */
export const RECENT_SIZES = [4, 6, 10] as const;
export const PREFERENCE_FIELDS = ['moderationStatus', 'artistStatus', 'campaignStatus', 'catalogTab', 'recentActivity', 'nextAfterDecision'] as const;
export type PreferenceField = (typeof PREFERENCE_FIELDS)[number];
export type PreferenceValues = Pick<ArmPreferences, PreferenceField>;

/** Defaults = the behaviour before M6: no queue filter, catalog tracks tab, 6 recent events, stay on the item. */
export function defaultPreferences(): ArmPreferences {
  return { id: PREFERENCES_ID, mock: true, moderationStatus: '', artistStatus: '', campaignStatus: '', catalogTab: 'tracks', recentActivity: 6, nextAfterDecision: false };
}

const isFilter = (v: string) => v === '' || (REVIEW_STATUSES as readonly string[]).includes(v);

export type PreferenceError = 'forbidden' | 'invalid' | 'same-status';

/** Saves the ARM settings (permission arm.settings.manage); the audit event names the changed fields. */
export function updatePreferences(current: ArmPreferences, next: PreferenceValues, ctx: ArmContext): { ok: true; patch: Partial<ArmPreferences>; event: Audit } | { ok: false; error: PreferenceError } {
  if (!armCan(ctx.matrix, ctx.actor.roleId, 'arm.settings.manage')) return { ok: false, error: 'forbidden' };
  const valid =
    isFilter(next.moderationStatus) &&
    isFilter(next.artistStatus) &&
    isFilter(next.campaignStatus) &&
    (CATALOG_TABS as readonly string[]).includes(next.catalogTab) &&
    (RECENT_SIZES as readonly number[]).includes(next.recentActivity) &&
    typeof next.nextAfterDecision === 'boolean';
  if (!valid) return { ok: false, error: 'invalid' };
  const changed = PREFERENCE_FIELDS.filter((k) => current[k] !== next[k]);
  if (changed.length === 0) return { ok: false, error: 'same-status' };
  const values = Object.fromEntries(PREFERENCE_FIELDS.map((k) => [k, next[k]])) as PreferenceValues;
  return { ok: true, patch: { ...values, updatedAt: ctx.now }, event: audit({ action: 'settings.preferences', entity: { type: 'setting', id: PREFERENCES_ID, label: 'preferences' }, reason: changed.join(', ') }, ctx) };
}

/** Default M6 data (also restored by "Сбросить демо-данные"): role matrix, demo staff roles, settings. */
export function defaultM6Data(): { roles: RoleConfig[]; staffRoles: StaffAssignment[]; preferences: ArmPreferences[] } {
  return {
    roles: defaultRoleConfigs(),
    staffRoles: DEMO_STAFF.filter((s) => s.app === 'arm').map((s) => ({ id: s.id, mock: true, roleId: s.roleId })),
    preferences: [defaultPreferences()],
  };
}
