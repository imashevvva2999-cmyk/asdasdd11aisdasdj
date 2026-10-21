import { checkReason } from '@mmusic/backoffice/review';

import { audit, type CrmContext } from './permissions.ts';
import { allowed, clean, validDate, type Audit, type Failure, type FieldErrors } from './rules.ts';
import { type CrmContact, type CrmOrganization, type Deal, type DealOutcome, type DealStage } from './types.ts';

/**
 * Deal pipeline rules (M5, M6) as pure functions: validation, the (prototype) permission checks — crm.deals.edit for
 * details and open-stage moves, crm.deals.close for won / lost / reopen (M6) — and the audit event of each change.
 * Open stages come from the configurable pipeline (enabled stage ids, in order); won / lost are system stages.
 */

export const MAX_ESTIMATE_KGS = 100_000_000;

export const dealOutcome = (stage: DealStage): DealOutcome => (stage === 'won' ? 'won' : stage === 'lost' ? 'lost' : 'open');

export type DealInput = { title: string; organizationId: string; contactId: string; ownerId: string; estimatedValue: string; expectedCloseAt: string; description: string; stage: DealStage };
export type DealField = keyof DealInput;
type DealValue = Pick<Deal, 'title' | 'organizationId' | 'contactId' | 'ownerId' | 'estimatedValueKgs' | 'expectedCloseAt' | 'description'>;

export function dealInput(d?: Deal, ownerId = ''): DealInput {
  return {
    title: d?.title ?? '',
    organizationId: d?.organizationId ?? '',
    contactId: d?.contactId ?? '',
    ownerId: d?.ownerId ?? ownerId,
    estimatedValue: d?.estimatedValueKgs === undefined ? '' : String(d.estimatedValueKgs),
    expectedCloseAt: d?.expectedCloseAt ?? '',
    description: d?.description ?? '',
    stage: d?.stage ?? 'lead',
  };
}

/** Parses "120 000" / "120000" to a whole number of KGS; '' → undefined; anything else → NaN. */
export function parseKgs(text: string): number | undefined {
  const t = text.replace(/[\s  ]/g, '');
  if (!t) return undefined;
  return /^\d+$/.test(t) ? Number(t) : Number.NaN;
}

/** `openStages`: enabled open stage ids; when given, the (create-time) stage must be one of them. */
export function validateDeal(input: DealInput, organizations: CrmOrganization[], contacts: CrmContact[], staffIds: string[], openStages?: readonly string[]): { ok: true; value: DealValue } | { ok: false; fields: FieldErrors<DealField> } {
  const fields: FieldErrors<DealField> = {};
  const title = clean(input.title);
  const contact = contacts.find((c) => c.id === input.contactId);
  const value = parseKgs(input.estimatedValue);
  if (!title) fields.title = 'required';
  else if (title.length > 120) fields.title = 'too-long';
  if (!input.organizationId) fields.organizationId = 'required';
  else if (!organizations.some((o) => o.id === input.organizationId)) fields.organizationId = 'unknown-organization';
  if (input.contactId && !contact) fields.contactId = 'unknown-contact';
  else if (contact && input.organizationId && contact.organizationId !== input.organizationId) fields.contactId = 'contact-not-in-org';
  if (!input.ownerId) fields.ownerId = 'required';
  else if (!staffIds.includes(input.ownerId)) fields.ownerId = 'unknown-staff';
  if (value !== undefined && (!Number.isFinite(value) || value > MAX_ESTIMATE_KGS)) fields.estimatedValue = 'value-invalid';
  if (input.expectedCloseAt && !validDate(input.expectedCloseAt)) fields.expectedCloseAt = 'date-invalid';
  if (clean(input.description).length > 500) fields.description = 'too-long';
  if (openStages && !openStages.includes(input.stage)) fields.stage = 'stage-invalid';
  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return {
    ok: true,
    value: {
      title,
      organizationId: input.organizationId,
      contactId: input.contactId || undefined,
      ownerId: input.ownerId,
      estimatedValueKgs: value,
      expectedCloseAt: input.expectedCloseAt || undefined,
      description: clean(input.description) || undefined,
    },
  };
}

/** Drops undefined keys so stored records stay clean. */
const compact = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export function createDeal(input: DealInput, organizations: CrmOrganization[], contacts: CrmContact[], staffIds: string[], openStages: readonly string[], ctx: CrmContext): { ok: true; record: Omit<Deal, 'id' | 'mock'>; audit: (id: string) => Audit } | Failure<DealField> {
  if (!allowed(ctx, 'crm.deals.edit')) return { ok: false, error: 'forbidden' };
  const v = validateDeal(input, organizations, contacts, staffIds, openStages);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  return {
    ok: true,
    record: compact({ ...v.value, stage: input.stage, stageChangedAt: ctx.now, createdAt: ctx.now }),
    audit: (id) => audit({ action: 'deal.create', entity: { type: 'deal', id, label: v.value.title }, toStatus: input.stage }, ctx),
  };
}

/** Edits the deal's details; the stage moves only through moveDeal. */
export function updateDeal(deal: Deal, input: DealInput, organizations: CrmOrganization[], contacts: CrmContact[], staffIds: string[], ctx: CrmContext): { ok: true; patch: Partial<Deal>; event: Audit } | Failure<DealField> {
  if (!allowed(ctx, 'crm.deals.edit')) return { ok: false, error: 'forbidden' };
  const v = validateDeal(input, organizations, contacts, staffIds);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  return {
    ok: true,
    patch: { ...v.value, updatedAt: ctx.now },
    event: audit({ action: v.value.ownerId !== deal.ownerId ? 'deal.assign' : 'deal.update', entity: { type: 'deal', id: deal.id, label: v.value.title } }, ctx),
  };
}

/**
 * Moves a deal: between enabled open stages (crm.deals.edit), to won (confirmation in the UI) or lost (reason
 * required), or back to an enabled open stage from won / lost — closing and reopening need crm.deals.close (M6).
 */
export function moveDeal(deal: Deal, to: DealStage, reason: string | undefined, openStages: readonly string[], ctx: CrmContext): { ok: true; patch: Partial<Deal>; event: Audit } | Failure<'reason'> {
  const from = dealOutcome(deal.stage);
  const outcome = dealOutcome(to);
  const closing = from !== 'open' || outcome !== 'open';
  if (!allowed(ctx, 'crm.deals.edit') || (closing && !allowed(ctx, 'crm.deals.close'))) return { ok: false, error: 'forbidden' };
  if (deal.stage === to) return { ok: false, error: 'same-status' };
  if (outcome === 'open' && !openStages.includes(to)) return { ok: false, error: 'invalid-transition' };
  if (from !== 'open' && outcome !== 'open') return { ok: false, error: 'invalid-transition' };
  if (to === 'lost') {
    const invalid = checkReason(reason, true);
    if (invalid === 'reason-required') return { ok: false, error: 'invalid', fields: { reason: 'required' } };
    if (invalid === 'reason-too-short') return { ok: false, error: 'invalid', fields: { reason: 'too-short' } };
  }
  const action = outcome === 'won' ? 'deal.won' : outcome === 'lost' ? 'deal.lost' : from !== 'open' ? 'deal.reopen' : 'deal.stage';
  const note = clean(reason) || undefined;
  return {
    ok: true,
    patch: { stage: to, stageChangedAt: ctx.now, closedAt: outcome === 'open' ? undefined : ctx.now, lostReason: to === 'lost' ? note : undefined, updatedAt: ctx.now },
    event: audit({ action, entity: { type: 'deal', id: deal.id, label: deal.title }, fromStatus: deal.stage, toStatus: to, reason: note }, ctx),
  };
}

/** Next enabled open stage (the board's "→" button); undefined at the last one, when closed or on a disabled stage. */
export function nextStage(stage: DealStage, openStages: readonly string[]): DealStage | undefined {
  const i = openStages.indexOf(stage);
  return i >= 0 && i < openStages.length - 1 ? openStages[i + 1] : undefined;
}
