import type { Repository } from '@mmusic/backoffice/data';
import { useBackoffice, useRole } from '@mmusic/backoffice/react';
import type { ReviewDecision } from '@mmusic/backoffice/review';

import { applyRoleChanges, assignStaffRole, buildArmMatrix, decisionContext, resetRole, type ArmContext, type RoleChange, type RoleError } from '@/domain/permissions';
import { defaultPreferences, PREFERENCES_ID, updatePreferences, type PreferenceError, type PreferenceValues } from '@/domain/settings';
import type { ArmCollections, ListingStatus, UserStatus } from '@/domain/types';
import { changeListing, changeUserStatus, decideCampaign, decideSubmission, reviewArtist, type CampaignError, type ListingError, type UserStatusError } from '@/domain/workflow';

/** Why an action was refused (shared review errors + user-status, campaign, listing, role and settings ones); null = saved. */
export type ActionError = UserStatusError | CampaignError | ListingError | RoleError | PreferenceError;

/**
 * ARM actions wired to the mock repositories: re-read the record, validate with the pure workflow (permission,
 * status, reason), save the patch, then append the audit event. Async like a future backend call.
 */
export function useArmActions() {
  const bo = useBackoffice();
  const roleId = useRole()?.id ?? '';
  const repo = <K extends keyof ArmCollections>(name: K) => bo.data.repository(name) as unknown as Repository<ArmCollections[K][number]>;
  const state = () => bo.data.store.getState().data as unknown as Partial<ArmCollections>;
  // The ARM matrix and staff assignments are read at action time (M6), so a change in the roles screen applies at once
  // and an action invoked directly is still checked against the current matrix.
  const armCtx = (): ArmContext => {
    const staffId = state().staffRoles?.find((a) => a.roleId === roleId)?.id;
    return { matrix: buildArmMatrix(state().roles ?? []), actor: { staffId: staffId ?? `role:${roleId}`, roleId }, now: new Date().toISOString() };
  };
  const ctx = () => decisionContext(armCtx());

  return {
    async decideSubmission(id: string, decision: ReviewDecision, reason?: string): Promise<ActionError | null> {
      const item = await repo('submissions').get(id);
      if (!item) return 'not-found';
      const out = decideSubmission(item, decision, reason, ctx());
      if (!out.ok) return out.error;
      await repo('submissions').update(id, out.patch);
      await repo('activity').create(out.event);
      return null;
    },
    async reviewArtist(id: string, decision: ReviewDecision, reason?: string): Promise<ActionError | null> {
      const item = await repo('artists').get(id);
      if (!item) return 'not-found';
      const out = reviewArtist(item, decision, reason, ctx());
      if (!out.ok) return out.error;
      await repo('artists').update(id, out.patch);
      await repo('activity').create(out.event);
      return null;
    },
    async decideCampaign(id: string, decision: ReviewDecision, reason?: string): Promise<ActionError | null> {
      const item = await repo('campaigns').get(id);
      if (!item) return 'not-found';
      const out = decideCampaign(item, await repo('submissions').get(item.submissionId), decision, reason, ctx());
      if (!out.ok) return out.error;
      await repo('campaigns').update(id, out.patch);
      await repo('activity').create(out.event);
      return null;
    },
    async changeListing(id: string, to: ListingStatus, reason?: string): Promise<ActionError | null> {
      const item = await repo('submissions').get(id);
      if (!item) return 'not-found';
      const out = changeListing(item, to, reason, ctx());
      if (!out.ok) return out.error;
      await repo('submissions').update(id, out.patch);
      await repo('activity').create(out.event);
      return null;
    },
    async changeUserStatus(id: string, to: UserStatus, reason?: string): Promise<ActionError | null> {
      const item = await repo('users').get(id);
      if (!item) return 'not-found';
      const out = changeUserStatus(item, to, reason, ctx());
      if (!out.ok) return out.error;
      await repo('users').update(id, out.patch);
      await repo('activity').create(out.event);
      return null;
    },
    async saveRoleChanges(changes: RoleChange[]): Promise<ActionError | null> {
      const out = applyRoleChanges(await repo('roles').list(), changes, armCtx());
      if (!out.ok) return out.error;
      for (const p of out.patches) await repo('roles').update(p.id, { permissions: p.permissions, updatedAt: new Date().toISOString() });
      for (const e of out.events) await repo('activity').create(e);
      return null;
    },
    async resetRole(id: string): Promise<ActionError | null> {
      const config = await repo('roles').get(id);
      if (!config) return 'unknown-role';
      const out = resetRole(config, armCtx());
      if (!out.ok) return out.error;
      await repo('roles').update(id, { ...out.patch, updatedAt: new Date().toISOString() });
      await repo('activity').create(out.event);
      return null;
    },
    async assignStaffRole(staffId: string, roleId: string): Promise<ActionError | null> {
      const name = bo.staff.find((st) => st.id === staffId)?.name ?? staffId;
      const out = assignStaffRole(staffId, name, roleId, await repo('staffRoles').list(), armCtx());
      if (!out.ok) return out.error;
      await repo('staffRoles').update(staffId, { ...out.patch, updatedAt: new Date().toISOString() });
      await repo('activity').create(out.event);
      return null;
    },
    async updatePreferences(next: PreferenceValues): Promise<ActionError | null> {
      const current = (await repo('preferences').get(PREFERENCES_ID)) ?? defaultPreferences();
      const out = updatePreferences(current, next, armCtx());
      if (!out.ok) return out.error;
      if (await repo('preferences').get(PREFERENCES_ID)) await repo('preferences').update(PREFERENCES_ID, out.patch);
      else bo.data.store.setState((st) => ({ data: { ...st.data, preferences: [{ ...current, ...out.patch }] } }));
      await repo('activity').create(out.event);
      return null;
    },
  };
}
