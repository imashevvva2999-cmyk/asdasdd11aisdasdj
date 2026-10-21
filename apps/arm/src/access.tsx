import { useMemo, type ReactNode } from 'react';

import type { Localized, StaffUser } from '@mmusic/backoffice/domain';
import { useBackoffice, useCollection, useRole } from '@mmusic/backoffice/react';
import { AppShell, NoAccessPage, type NavGroup, type NavItem } from '@mmusic/backoffice/ui';

import { armCan, buildArmMatrix, type ArmMatrix, type ArmPermission } from '@/domain/permissions';
import { defaultPreferences, PREFERENCES_ID } from '@/domain/settings';
import type { ArmPreferences, RoleConfig, StaffAssignment } from '@/domain/types';

/**
 * ARM access layer (M6): every screen, button and action asks the same editable, browser-local ARM permission matrix
 * (stored with the demo data, restored by "Сбросить демо-данные"). Prototype only — not authentication or security.
 */

export function useArmMatrix(): ArmMatrix {
  const roles = useCollection<RoleConfig>('roles');
  return useMemo(() => buildArmMatrix(roles), [roles]);
}

export function useArmCan(permission: ArmPermission): boolean {
  const matrix = useArmMatrix();
  return armCan(matrix, useRole()?.id, permission);
}

/** Route guard: the page for roles with the permission (ARM matrix), "no access" otherwise — prototype UI, not security. */
export function ArmGuard({ permission, children }: { permission: ArmPermission; children: ReactNode }) {
  return useArmCan(permission) ? children : <NoAccessPage />;
}

/** The demo staff member acting under the dev role switcher: the first staff member assigned to that role (M6). */
export function useArmActor(): { roleId: string; staff: StaffUser | undefined } {
  const bo = useBackoffice();
  const roleId = useRole()?.id ?? '';
  const assignments = useCollection<StaffAssignment>('staffRoles');
  const staffId = assignments.find((a) => a.roleId === roleId)?.id;
  return { roleId, staff: bo.staff.find((s) => s.id === staffId) };
}

export function useArmPreferences(): ArmPreferences {
  return useCollection<ArmPreferences>('preferences').find((p) => p.id === PREFERENCES_ID) ?? defaultPreferences();
}

export type ArmNavItem = Omit<NavItem, 'permission'> & { permission: ArmPermission };
export type ArmNavGroup = { label: Localized; items: ArmNavItem[] };

/**
 * The shared shell with the sidebar filtered by the ARM matrix. The shell's own check then sees arm.dashboard.view,
 * which every ARM role always has (locked on), so the ARM matrix alone decides.
 */
export function ArmShell({ nav }: { nav: ArmNavGroup[] }) {
  const matrix = useArmMatrix();
  const roleId = useRole()?.id;
  const groups: NavGroup[] = nav
    .map((g) => ({ label: g.label, items: g.items.filter((i) => armCan(matrix, roleId, i.permission)).map((i) => ({ ...i, permission: 'arm.dashboard.view' as const })) }))
    .filter((g) => g.items.length > 0);
  return <AppShell nav={groups} />;
}
