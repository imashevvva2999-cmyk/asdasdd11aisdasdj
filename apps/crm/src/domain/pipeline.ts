import { auditEvent, checkReason, type DecisionContext } from '@mmusic/backoffice/review';

import { allowed, clean, validDate, type Audit, type Failure, type FieldErrors } from './rules.ts';
import { OPEN_STAGES, type CrmContact, type CrmOrganization, type Deal, type DealOutcome, type DealStage } from './types.ts';

/**
 * Deal pipeline rules (M5) as pure functions: validation, the (prototype) permission check crm.deals.edit, stage
 * transitions and the audit event of each change. Stages are a provisional proposal (OQ-55).
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

export function validateDeal(input: DealInput, organizations: CrmOrganization[], contacts: CrmContact[], staffIds: string[]): { ok: true; value: DealValue } | { ok: false; fields: FieldErrors<DealField> } {
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
  if (!OPEN_STAGES.includes(input.stage)) fields.stage = 'stage-invalid';
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

export function createDeal(input: DealInput, organizations: CrmOrganization[], contacts: CrmContact[], staffIds: string[], ctx: DecisionContext): { ok: true; record: Omit<Deal, 'id' | 'mock'>; audit: (id: string) => Audit } | Failure<DealField> {
  if (!allowed(ctx, 'crm.deals.edit')) return { ok: false, error: 'forbidden' };
  const v = validateDeal(input, organizations, contacts, staffIds);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  return {
    ok: true,
    record: compact({ ...v.value, stage: input.stage, stageChangedAt: ctx.now, createdAt: ctx.now }),
    audit: (id) => auditEvent({ action: 'deal.create', entity: { type: 'deal', id, label: v.value.title }, toStatus: input.stage }, ctx),
  };
}

/** Edits the deal's details; the stage moves only through moveDeal. */
export function updateDeal(deal: Deal, input: DealInput, organizations: CrmOrganization[], contacts: CrmContact[], staffIds: string[], ctx: DecisionContext): { ok: true; patch: Partial<Deal>; event: Audit } | Failure<DealField> {
  if (!allowed(ctx, 'crm.deals.edit')) return { ok: false, error: 'forbidden' };
  const v = validateDeal({ ...input, stage: 'lead' }, organizations, contacts, staffIds);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  return {
    ok: true,
    patch: { ...v.value, updatedAt: ctx.now },
    event: auditEvent({ action: v.value.ownerId !== deal.ownerId ? 'deal.assign' : 'deal.update', entity: { type: 'deal', id: deal.id, label: v.value.title } }, ctx),
  };
}

/**
 * Moves a deal: between open stages, to won (confirmation in the UI), to lost (reason required), or back to an
 * open stage from won / lost (reopen).
 */
export function moveDeal(deal: Deal, to: DealStage, reason: string | undefined, ctx: DecisionContext): { ok: true; patch: Partial<Deal>; event: Audit } | Failure<'reason'> {
  if (!allowed(ctx, 'crm.deals.edit')) return { ok: false, error: 'forbidden' };
  if (deal.stage === to) return { ok: false, error: 'same-status' };
  if (to === 'lost') {
    const invalid = checkReason(reason, true);
    if (invalid === 'reason-required') return { ok: false, error: 'invalid', fields: { reason: 'required' } };
    if (invalid === 'reason-too-short') return { ok: false, error: 'invalid', fields: { reason: 'too-short' } };
  }
  const from = dealOutcome(deal.stage);
  const outcome = dealOutcome(to);
  if (from !== 'open' && outcome !== 'open') return { ok: false, error: 'invalid-transition' };
  const action = outcome === 'won' ? 'deal.won' : outcome === 'lost' ? 'deal.lost' : from !== 'open' ? 'deal.reopen' : 'deal.stage';
  const note = clean(reason) || undefined;
  return {
    ok: true,
    patch: { stage: to, stageChangedAt: ctx.now, closedAt: outcome === 'open' ? undefined : ctx.now, lostReason: to === 'lost' ? note : undefined, updatedAt: ctx.now },
    event: auditEvent({ action, entity: { type: 'deal', id: deal.id, label: deal.title }, fromStatus: deal.stage, toStatus: to, reason: note }, ctx),
  };
}

/** Next open stage (for the board's "→" button); undefined at the last open stage or when closed. */
export function nextStage(stage: DealStage): DealStage | undefined {
  const i = OPEN_STAGES.indexOf(stage);
  return i >= 0 && i < OPEN_STAGES.length - 1 ? OPEN_STAGES[i + 1] : undefined;
}
