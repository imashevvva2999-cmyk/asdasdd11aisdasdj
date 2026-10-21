import type { Repository } from '@mmusic/backoffice/data';
import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useActor, useBackoffice } from '@mmusic/backoffice/react';
import type { DecisionContext } from '@mmusic/backoffice/review';

import {
  changeRelationship,
  completeFollowUp,
  createContact,
  createOrganization,
  linkContact,
  logInteraction,
  updateContact,
  updateOrganization,
  type ContactInput,
  type FieldErrors,
  type InteractionInput,
  type OrganizationInput,
} from '@/domain/rules';
import type { CrmCollections, RelationshipStatus } from '@/domain/types';

/** Result of a CRM action: saved (with the record id), refused, or invalid input with per-field errors. */
export type ActionResult<K extends string = string> = { ok: true; id: string } | { ok: false; error: 'forbidden' | 'not-found' | 'same-status' } | { ok: false; error: 'invalid'; fields: FieldErrors<K> };

/**
 * CRM actions wired to the mock repositories: validate with the pure rules (permission, input), save, then append
 * the audit event. Async like a future backend call.
 */
export function useCrmActions() {
  const bo = useBackoffice();
  const { roleId, staff } = useActor();
  const repo = <K extends keyof CrmCollections>(name: K) => bo.data.repository(name) as unknown as Repository<CrmCollections[K][number]>;
  const ctx = (): DecisionContext => ({ matrix: bo.matrix, actor: { staffId: staff?.id ?? `role:${roleId}`, roleId }, now: new Date().toISOString() });
  const audit = (event: Omit<ActivityEvent, 'id' | 'mock'>) => repo('activity').create(event);

  return {
    async createContact(input: ContactInput): Promise<ActionResult<keyof ContactInput>> {
      const out = createContact(input, await repo('organizations').list(), ctx());
      if (!out.ok) return out;
      const created = await repo('contacts').create(out.record);
      await audit(out.audit(created.id));
      return { ok: true, id: created.id };
    },
    async updateContact(id: string, input: ContactInput): Promise<ActionResult<keyof ContactInput>> {
      const item = await repo('contacts').get(id);
      if (!item) return { ok: false, error: 'not-found' };
      const out = updateContact(item, input, await repo('organizations').list(), ctx());
      if (!out.ok) return out;
      await repo('contacts').update(id, out.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async linkContact(id: string, organizationId: string): Promise<ActionResult> {
      const item = await repo('contacts').get(id);
      if (!item) return { ok: false, error: 'not-found' };
      const out = linkContact(item, organizationId, await repo('organizations').list(), ctx());
      if (!out.ok) return out;
      await repo('contacts').update(id, out.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async createOrganization(input: OrganizationInput): Promise<ActionResult<keyof OrganizationInput>> {
      const out = createOrganization(input, ctx());
      if (!out.ok) return out;
      const created = await repo('organizations').create(out.record);
      await audit(out.audit(created.id));
      return { ok: true, id: created.id };
    },
    async updateOrganization(id: string, input: OrganizationInput): Promise<ActionResult<keyof OrganizationInput>> {
      const item = await repo('organizations').get(id);
      if (!item) return { ok: false, error: 'not-found' };
      const out = updateOrganization(item, input, ctx());
      if (!out.ok) return out;
      await repo('organizations').update(id, out.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async changeRelationship(id: string, to: RelationshipStatus, note?: string): Promise<ActionResult> {
      const item = await repo('organizations').get(id);
      if (!item) return { ok: false, error: 'not-found' };
      const out = changeRelationship(item, to, note, ctx());
      if (!out.ok) return out;
      await repo('organizations').update(id, out.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async logInteraction(input: InteractionInput): Promise<ActionResult<keyof InteractionInput>> {
      const out = logInteraction(input, await repo('contacts').list(), await repo('organizations').list(), ctx());
      if (!out.ok) return out;
      const created = await repo('interactions').create(out.record);
      await audit(out.audit(created.id));
      return { ok: true, id: created.id };
    },
    async completeFollowUp(id: string): Promise<ActionResult> {
      const item = await repo('interactions').get(id);
      if (!item) return { ok: false, error: 'not-found' };
      const out = completeFollowUp(item, ctx());
      if (!out.ok) return out;
      await repo('interactions').update(id, out.patch);
      await audit(out.event);
      return { ok: true, id };
    },
  };
}
