import type { Repository } from '@mmusic/backoffice/data';
import type { ActivityEvent, Localized } from '@mmusic/backoffice/domain';
import { useBackoffice, useRole } from '@mmusic/backoffice/react';

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
  type Failure,
  type FieldErrors,
  type InteractionInput,
  type OrganizationInput,
} from '@/domain/rules';
import { applyRoleChanges, assignStaffRole, buildCrmMatrix, resetRole, type CrmContext, type RoleChange } from '@/domain/permissions';
import { createDeal, moveDeal, updateDeal, type DealInput } from '@/domain/pipeline';
import { addStage, addTag, deleteStage, deleteTag, disableStage, enableStage, moveStage, openStages, renameStage, renameTag, tagUsage, updatePreferences, PREFERENCES_ID, type PreferenceField, type TagEdit } from '@/domain/settings';
import { changeTaskStatus, createTask, updateTask, type TaskInput } from '@/domain/tasks';
import type { CrmCollections, CrmPreferences, DealStage, RelationshipStatus, TaskStatus } from '@/domain/types';

/** Result of a CRM action: saved (with the record id), refused, or invalid input with per-field errors. */
export type ActionResult<K extends string = string> = { ok: true; id: string } | Exclude<Failure<K>, { error: 'invalid' }> | { ok: false; error: 'invalid'; fields: FieldErrors<K> };

/**
 * CRM actions wired to the mock repositories: validate with the pure rules (permission, input), save, then append
 * the audit event. Async like a future backend call.
 */
export function useCrmActions() {
  const bo = useBackoffice();
  const roleId = useRole()?.id ?? '';
  const repo = <K extends keyof CrmCollections>(name: K) => bo.data.repository(name) as unknown as Repository<CrmCollections[K][number]>;
  const state = () => bo.data.store.getState().data as unknown as CrmCollections;
  // The CRM matrix and staff assignments are read at action time, so a change in the roles screen applies at once.
  const ctx = (): CrmContext => {
    const staffId = state().staffRoles?.find((a) => a.roleId === roleId)?.id;
    return { matrix: buildCrmMatrix(state().roles ?? []), actor: { staffId: staffId ?? `role:${roleId}`, roleId }, now: new Date().toISOString() };
  };
  const openIds = () => openStages(state().pipeline ?? []).map((st) => st.id);
  const audit = (event: Omit<ActivityEvent, 'id' | 'mock'>) => repo('activity').create(event);
  const staffIds = bo.staff.filter((s) => s.app === 'crm').map((s) => s.id);
  const applyTagEdit = async (edit: TagEdit) => {
    for (const p of edit.contactPatches) await repo('contacts').update(p.id, p.patch);
    for (const p of edit.organizationPatches) await repo('organizations').update(p.id, p.patch);
    for (const p of edit.recordPatches) await repo('tags').update(p.id, p.patch);
    for (const id of edit.recordRemovals) await repo('tags').remove(id);
    if (edit.newRecord) await repo('tags').create(edit.newRecord);
  };
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
      const out = createDeal(input, await repo('organizations').list(), await repo('contacts').list(), staffIds, openIds(), ctx());
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
      const out = moveDeal(item, to, reason, openIds(), ctx());
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
    // ------------------------------------------------------------ settings (M6)
    async addStage(label: Localized): Promise<ActionResult<'ru' | 'en'>> {
      const out = addStage(label, await repo('pipeline').list(), ctx());
      if (!out.ok) return out;
      const items = state().pipeline;
      bo.data.store.setState((st) => ({ data: { ...st.data, pipeline: [...items, out.record] } }));
      await audit(out.event);
      return { ok: true, id: out.record.id };
    },
    async renameStage(id: string, label: Localized): Promise<ActionResult<'ru' | 'en'>> {
      const out = renameStage(id, label, await repo('pipeline').list(), ctx());
      if (!out.ok) return out;
      await repo('pipeline').update(id, out.patch.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async moveStage(id: string, direction: -1 | 1): Promise<ActionResult> {
      const out = moveStage(id, direction, await repo('pipeline').list(), ctx());
      if (!out.ok) return out;
      for (const p of out.patches) await repo('pipeline').update(p.id, p.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async disableStage(id: string, targetId?: string): Promise<ActionResult<'target'>> {
      const out = disableStage(id, targetId, await repo('pipeline').list(), await repo('deals').list(), ctx());
      if (!out.ok) return out;
      for (const p of out.dealPatches) await repo('deals').update(p.id, p.patch);
      await repo('pipeline').update(id, out.patch.patch);
      for (const e of out.events) await audit(e);
      return { ok: true, id };
    },
    async enableStage(id: string): Promise<ActionResult> {
      const out = enableStage(id, await repo('pipeline').list(), ctx());
      if (!out.ok) return out;
      await repo('pipeline').update(id, out.patch.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async deleteStage(id: string): Promise<ActionResult> {
      const out = deleteStage(id, await repo('pipeline').list(), await repo('deals').list(), await repo('activity').list(), ctx());
      if (!out.ok) return out;
      await repo('pipeline').remove(id);
      await audit(out.event);
      return { ok: true, id };
    },
    async addTag(name: string): Promise<ActionResult<'name'>> {
      const existing = tagUsage(await repo('tags').list(), await repo('contacts').list(), await repo('organizations').list()).map((x) => x.name);
      const out = addTag(name, existing, ctx());
      if (!out.ok) return out;
      const created = await repo('tags').create(out.record);
      await audit(out.event);
      return { ok: true, id: created.id };
    },
    async renameTag(from: string, to: string): Promise<ActionResult<'name'>> {
      const out = renameTag(from, to, { records: await repo('tags').list(), contacts: await repo('contacts').list(), organizations: await repo('organizations').list() }, ctx());
      if (!out.ok) return out;
      await applyTagEdit(out);
      await audit(out.event);
      return { ok: true, id: from };
    },
    async deleteTag(name: string): Promise<ActionResult> {
      const out = deleteTag(name, { records: await repo('tags').list(), contacts: await repo('contacts').list(), organizations: await repo('organizations').list() }, ctx());
      if (!out.ok) return out;
      await applyTagEdit(out);
      await audit(out.event);
      return { ok: true, id: name };
    },
    async updatePreferences(next: Pick<CrmPreferences, PreferenceField>): Promise<ActionResult<PreferenceField>> {
      const current = (await repo('preferences').get(PREFERENCES_ID)) ?? state().preferences?.[0];
      if (!current) return { ok: false, error: 'not-found' };
      const out = updatePreferences(current, next, ctx());
      if (!out.ok) return out;
      await repo('preferences').update(PREFERENCES_ID, out.patch);
      await audit(out.event);
      return { ok: true, id: PREFERENCES_ID };
    },
    // ------------------------------------------------------------ roles (M6)
    async saveRoleChanges(changes: RoleChange[]): Promise<ActionResult> {
      const out = applyRoleChanges(await repo('roles').list(), changes, ctx());
      if (!out.ok) return out;
      for (const p of out.patches) await repo('roles').update(p.id, { permissions: p.permissions, updatedAt: new Date().toISOString() });
      for (const e of out.events) await audit(e);
      return { ok: true, id: 'roles' };
    },
    async resetRole(id: string): Promise<ActionResult> {
      const config = await repo('roles').get(id);
      if (!config) return { ok: false, error: 'not-found' };
      const out = resetRole(config, ctx());
      if (!out.ok) return out;
      await repo('roles').update(id, out.patch);
      await audit(out.event);
      return { ok: true, id };
    },
    async assignStaffRole(staffId: string, roleId: string): Promise<ActionResult> {
      const name = bo.staff.find((st) => st.id === staffId)?.name ?? staffId;
      const out = assignStaffRole(staffId, name, roleId, await repo('staffRoles').list(), ctx());
      if (!out.ok) return out;
      await repo('staffRoles').update(staffId, { ...out.patch, updatedAt: new Date().toISOString() });
      await audit(out.event);
      return { ok: true, id: staffId };
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
