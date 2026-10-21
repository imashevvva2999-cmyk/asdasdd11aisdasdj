import { DEMO_STAFF } from '@mmusic/backoffice/mocks';

import { defaultRoleConfigs } from './permissions.ts';
import { defaultPipeline, defaultPreferences } from './settings.ts';
import type { CrmPreferences, RoleConfig, StaffAssignment, StageConfig, TagRecord } from './types.ts';

/**
 * Default M6 configuration (also restored by "Сбросить демо-данные"): the provisional pipeline stages, a small tag
 * registry with one not-yet-used fictional tag, preferences, the default role matrix and the demo staff roles.
 */
export function defaultM6Data(): { pipeline: StageConfig[]; tags: TagRecord[]; preferences: CrmPreferences[]; roles: RoleConfig[]; staffRoles: StaffAssignment[] } {
  return {
    pipeline: defaultPipeline(),
    tags: [{ id: 'tag-1', mock: true, name: 'приоритет', createdAt: '2026-10-21T08:00:00.000Z' }],
    preferences: [defaultPreferences()],
    roles: defaultRoleConfigs(),
    staffRoles: DEMO_STAFF.filter((s) => s.app === 'crm').map((s) => ({ id: s.id, mock: true, roleId: s.roleId })),
  };
}
