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
import { createDeal, moveDeal, updateDeal, type DealInput } from '@/domain/pipeline';
import { changeTaskStatus, createTask, updateTask, type TaskInput } from '@/domain/tasks';
import type { CrmCollections, DealStage, RelationshipStatus, TaskStatus } from '@/domain/types';

/** Result of a CRM action: saved (with the record id), refused, or invalid input with per-field errors. */
export type ActionResult<K extends string = string> = { ok: true; id: string } | { ok: false; error: 'forbidden' | 'not-found' | 'same-status' | 'invalid-transition' } | { ok: false; error: 'invalid'; fields: FieldErrors<K> };

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
  const staffIds = bo.staff.filter((s) => s.app === 'crm').map((s) => s.id);
  const links = async () => ({ contacts: await repo('contacts').list(), organizations: await repo('organizations').list(), deals: await repo('deals').list(), staffIds });

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
    async createDeal(input: DealInput): Promise<ActionResult<keyof DealInput>> {
      const out = createDeal(input, await repo('organizations').list(), await repo('contacts').list(), staffIds, ctx());
      if (!out.ok) return out;
      const created = await repo('deals').create(out.record);
      await audit(out.audit(created.id));
      return { ok: true, id: created.id };
    },
    async updateDeal(id: string, input: DealInput): Promise<ActionResult<keyof DealInput>> {
      const item = await repo('deals').get(id);
      if (!item) return { ok: false, error: 'not-found' };
      const out = updateDeal(item, input, await repo('organizations').list(), await repo('contacts').list(), staffIds, ctx());
      if (!out.ok) return out;
      await repo('deals').update(id, out.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async moveDeal(id: string, to: DealStage, reason?: string): Promise<ActionResult<'reason'>> {
      const item = await repo('deals').get(id);
      if (!item) return { ok: false, error: 'not-found' };
      const out = moveDeal(item, to, reason, ctx());
      if (!out.ok) return out;
      await repo('deals').update(id, out.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async createTask(input: TaskInput): Promise<ActionResult<keyof TaskInput>> {
      const out = createTask(input, await links(), ctx());
      if (!out.ok) return out;
      const created = await repo('tasks').create(out.record);
      await audit(out.audit(created.id));
      return { ok: true, id: created.id };
    },
    async updateTask(id: string, input: TaskInput): Promise<ActionResult<keyof TaskInput>> {
      const item = await repo('tasks').get(id);
      if (!item) return { ok: false, error: 'not-found' };
      const out = updateTask(item, input, await links(), ctx());
      if (!out.ok) return out;
      await repo('tasks').update(id, out.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async changeTaskStatus(id: string, to: TaskStatus, reason?: string): Promise<ActionResult> {
      const item = await repo('tasks').get(id);
      if (!item) return { ok: false, error: 'not-found' };
      const out = changeTaskStatus(item, to, reason, ctx());
      if (!out.ok) return out;
      await repo('tasks').update(id, out.patch);
      await audit(out.event);
      return { ok: true, id };
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
