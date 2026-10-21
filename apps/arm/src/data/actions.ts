import type { Repository } from '@mmusic/backoffice/data';
import { useActor, useBackoffice } from '@mmusic/backoffice/react';
import type { DecisionContext, ReviewDecision } from '@mmusic/backoffice/review';

import type { ArmCollections, UserStatus } from '@/domain/types';
import { changeUserStatus, decideSubmission, reviewArtist, type UserStatusError } from '@/domain/workflow';

/** Why an action was refused (shared review errors + user-status ones); null = saved. */
export type ActionError = UserStatusError;

/**
 * ARM actions wired to the mock repositories: re-read the record, validate with the pure workflow (permission,
 * status, reason), save the patch, then append the audit event. Async like a future backend call.
 */
export function useArmActions() {
  const bo = useBackoffice();
  const { roleId, staff } = useActor();
  const repo = <K extends keyof ArmCollections>(name: K) => bo.data.repository(name) as unknown as Repository<ArmCollections[K][number]>;
  const ctx = (): DecisionContext => ({ matrix: bo.matrix, actor: { staffId: staff?.id ?? `role:${roleId}`, roleId }, now: new Date().toISOString() });

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
    async changeUserStatus(id: string, to: UserStatus, reason?: string): Promise<ActionError | null> {
      const item = await repo('users').get(id);
      if (!item) return 'not-found';
      const out = changeUserStatus(item, to, reason, ctx());
      if (!out.ok) return out.error;
      await repo('users').update(id, out.patch);
      await repo('activity').create(out.event);
      return null;
    },
  };
}
