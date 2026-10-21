import { useMemo, type ReactNode } from 'react';

import type { Localized, StaffUser } from '@mmusic/backoffice/domain';
import { useBackoffice, useCollection, useLocale, useRole } from '@mmusic/backoffice/react';
import { AppShell, NoAccessPage, type NavGroup, type NavItem } from '@mmusic/backoffice/ui';

import { buildCrmMatrix, crmCan, type CrmMatrix, type CrmPermission } from '@/domain/permissions';
import { boardStages, defaultPreferences, openStages, PREFERENCES_ID } from '@/domain/settings';
import type { CrmPreferences, RoleConfig, StaffAssignment, StageConfig } from '@/domain/types';

/**
 * CRM access layer (M6): every screen and action asks the same editable, browser-local permission matrix (stored with
 * the demo data, restored by "Сбросить демо-данные"). Prototype only — this is not authentication or access control.
 */

export function useCrmMatrix(): CrmMatrix {
  const roles = useCollection<RoleConfig>('roles');
  return useMemo(() => buildCrmMatrix(roles), [roles]);
}

export function useCrmCan(permission: CrmPermission): boolean {
  const matrix = useCrmMatrix();
  return crmCan(matrix, useRole()?.id, permission);
}

/** Route guard: the page for roles with the permission (CRM matrix), "no access" otherwise — prototype UI, not security. */
export function CrmGuard({ permission, children }: { permission: CrmPermission; children: ReactNode }) {
  return useCrmCan(permission) ? children : <NoAccessPage />;
}

/** The demo staff member acting under the dev role switcher: the first staff member assigned to that role (M6). */
export function useCrmActor(): { roleId: string; staff: StaffUser | undefined } {
  const bo = useBackoffice();
  const roleId = useRole()?.id ?? '';
  const assignments = useCollection<StaffAssignment>('staffRoles');
  const staffId = assignments.find((a) => a.roleId === roleId)?.id;
  return { roleId, staff: bo.staff.find((s) => s.id === staffId) };
}

export type Pipeline = {
  config: StageConfig[];
  /** Enabled open stages, in order. */
  open: StageConfig[];
  openIds: string[];
  /** Enabled open stages, then won and lost (board, filters, reports). */
  board: StageConfig[];
  boardIds: string[];
  label: (id: string) => string;
};

export function pipelineFrom(config: StageConfig[], locale: keyof Localized): Pipeline {
  const open = openStages(config);
  const board = boardStages(config);
  return { config, open, openIds: open.map((s) => s.id), board, boardIds: board.map((s) => s.id), label: (id) => config.find((s) => s.id === id)?.label[locale] ?? id };
}

export function usePipeline(): Pipeline {
  const config = useCollection<StageConfig>('pipeline');
  const locale = useLocale();
  return useMemo(() => pipelineFrom(config, locale), [config, locale]);
}

export function usePreferences(): CrmPreferences {
  return useCollection<CrmPreferences>('preferences').find((p) => p.id === PREFERENCES_ID) ?? defaultPreferences();
}

export type CrmNavItem = Omit<NavItem, 'permission'> & { permission: CrmPermission };
export type CrmNavGroup = { label: Localized; items: CrmNavItem[] };

/**
 * The shared shell with the sidebar filtered by the CRM matrix. The shell's own check then sees
 * crm.dashboard.view, which every CRM role always has (locked on), so the CRM matrix alone decides.
 */
export function CrmShell({ nav }: { nav: CrmNavGroup[] }) {
  const matrix = useCrmMatrix();
  const roleId = useRole()?.id;
  const groups: NavGroup[] = nav
    .map((g) => ({ label: g.label, items: g.items.filter((i) => crmCan(matrix, roleId, i.permission)).map((i) => ({ ...i, permission: 'crm.dashboard.view' as const })) }))
    .filter((g) => g.items.length > 0);
  return <AppShell nav={groups} />;
}
