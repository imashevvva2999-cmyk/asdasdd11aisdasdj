import type { ActivityEvent, OrganizationKind } from '@mmusic/backoffice/domain';
import { can, type Permission } from '@mmusic/backoffice/rbac';
import { auditEvent, type DecisionContext } from '@mmusic/backoffice/review';

import type { ContactStatus, CrmCollections, CrmContact, CrmOrganization, Interaction, InteractionKind, RelationshipStatus } from './types.ts';

/**
 * CRM rules as pure functions (unit-tested): input validation, the (prototype, client-side) permission check and
 * the audit event of each change. Screens apply the result through the mock repositories.
 */

export type FieldError = 'required' | 'too-long' | 'email-invalid' | 'email-not-demo' | 'phone-not-demo' | 'unknown-organization' | 'unknown-contact' | 'date-invalid' | 'follow-up-before' | 'target-required';
export type FieldErrors<K extends string> = Partial<Record<K, FieldError>>;
export type Failure<K extends string> = { ok: false; error: 'forbidden' | 'not-found' | 'same-status' } | { ok: false; error: 'invalid'; fields: FieldErrors<K> };
type Audit = Omit<ActivityEvent, 'id' | 'mock'>;

/** Fictional data only: reserved example.* e-mail domains and the +996 555 000 0xx demo number range. */
export const DEMO_EMAIL = /^[^\s@]+@example\.(kg|com|org|net)$/i;
export const DEMO_PHONE = /^\+996 555 000 0\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const allowed = (ctx: DecisionContext, p: Permission) => can(ctx.matrix, ctx.actor.roleId, p);
const clean = (s: string | undefined) => (s ?? '').trim();

// ---------------------------------------------------------------- contacts

export type ContactInput = { name: string; positionRu: string; positionEn: string; organizationId: string; email: string; phone: string; tags: string; status: ContactStatus };
export type ContactField = keyof ContactInput;
type ContactValue = Omit<CrmContact, 'id' | 'mock' | 'createdAt' | 'updatedAt'>;

export function validateContact(input: ContactInput, organizations: CrmOrganization[]): { ok: true; value: ContactValue } | { ok: false; fields: FieldErrors<ContactField> } {
  const fields: FieldErrors<ContactField> = {};
  const name = clean(input.name);
  const email = clean(input.email).toLowerCase();
  const phone = clean(input.phone);
  if (!name) fields.name = 'required';
  else if (name.length > 80) fields.name = 'too-long';
  if (!clean(input.positionRu)) fields.positionRu = 'required';
  if (!email) fields.email = 'required';
  else if (!EMAIL.test(email)) fields.email = 'email-invalid';
  else if (!DEMO_EMAIL.test(email)) fields.email = 'email-not-demo';
  if (phone && !DEMO_PHONE.test(phone)) fields.phone = 'phone-not-demo';
  if (input.organizationId && !organizations.some((o) => o.id === input.organizationId)) fields.organizationId = 'unknown-organization';
  if (Object.keys(fields).length > 0) return { ok: false, fields };
  const tags = [...new Set(input.tags.split(',').map((t) => t.trim().toLocaleLowerCase()).filter(Boolean))];
  return {
    ok: true,
    value: {
      name,
      position: { ru: clean(input.positionRu), en: clean(input.positionEn) || clean(input.positionRu) },
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      email,
      phone,
      tags,
      status: input.status,
    },
  };
}

export function contactInput(c?: CrmContact): ContactInput {
  return { name: c?.name ?? '', positionRu: c?.position.ru ?? '', positionEn: c?.position.en ?? '', organizationId: c?.organizationId ?? '', email: c?.email ?? '', phone: c?.phone ?? '', tags: c?.tags.join(', ') ?? '', status: c?.status ?? 'active' };
}

export function createContact(input: ContactInput, organizations: CrmOrganization[], ctx: DecisionContext): { ok: true; record: Omit<CrmContact, 'id' | 'mock'>; audit: (id: string) => Audit } | Failure<ContactField> {
  if (!allowed(ctx, 'crm.contacts.edit')) return { ok: false, error: 'forbidden' };
  const v = validateContact(input, organizations);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  return { ok: true, record: { ...v.value, createdAt: ctx.now }, audit: (id) => auditEvent({ action: 'contact.create', entity: { type: 'contact', id, label: v.value.name }, toStatus: v.value.status }, ctx) };
}

export function updateContact(contact: CrmContact, input: ContactInput, organizations: CrmOrganization[], ctx: DecisionContext): { ok: true; patch: Partial<CrmContact>; event: Audit } | Failure<ContactField> {
  if (!allowed(ctx, 'crm.contacts.edit')) return { ok: false, error: 'forbidden' };
  const v = validateContact(input, organizations);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  const statusChanged = v.value.status !== contact.status;
  return {
    ok: true,
    patch: { ...v.value, organizationId: v.value.organizationId, updatedAt: ctx.now },
    event: auditEvent({ action: statusChanged ? 'contact.status' : 'contact.update', entity: { type: 'contact', id: contact.id, label: v.value.name }, ...(statusChanged ? { fromStatus: contact.status, toStatus: v.value.status } : {}) }, ctx),
  };
}

/** Links a contact to an organization (or unlinks with ''). */
export function linkContact(contact: CrmContact, organizationId: string, organizations: CrmOrganization[], ctx: DecisionContext): { ok: true; patch: Partial<CrmContact>; event: Audit } | Failure<'organizationId'> {
  if (!allowed(ctx, 'crm.contacts.edit')) return { ok: false, error: 'forbidden' };
  const org = organizations.find((o) => o.id === organizationId);
  if (organizationId && !org) return { ok: false, error: 'invalid', fields: { organizationId: 'unknown-organization' } };
  if ((contact.organizationId ?? '') === organizationId) return { ok: false, error: 'same-status' };
  return {
    ok: true,
    patch: { organizationId: organizationId || undefined, updatedAt: ctx.now },
    event: auditEvent({ action: organizationId ? 'contact.link' : 'contact.unlink', entity: { type: 'contact', id: contact.id, label: contact.name }, reason: org?.name }, ctx),
  };
}

// ---------------------------------------------------------------- organizations

export type OrganizationInput = { name: string; kind: OrganizationKind; city: string; about: string };
export type OrganizationField = keyof OrganizationInput;

export function validateOrganization(input: OrganizationInput): { ok: true; value: OrganizationInput } | { ok: false; fields: FieldErrors<OrganizationField> } {
  const fields: FieldErrors<OrganizationField> = {};
  const name = clean(input.name);
  if (!name) fields.name = 'required';
  else if (name.length > 80) fields.name = 'too-long';
  if (!clean(input.city)) fields.city = 'required';
  if (clean(input.about).length > 300) fields.about = 'too-long';
  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, value: { name, kind: input.kind, city: clean(input.city), about: clean(input.about) } };
}

export function organizationInput(o?: CrmOrganization): OrganizationInput {
  return { name: o?.name ?? '', kind: o?.kind ?? 'label', city: o?.city ?? '', about: o?.about ?? '' };
}

/** New organizations start as prospects; the relationship changes separately (partners permission). */
export function createOrganization(input: OrganizationInput, ctx: DecisionContext): { ok: true; record: Omit<CrmOrganization, 'id' | 'mock'>; audit: (id: string) => Audit } | Failure<OrganizationField> {
  if (!allowed(ctx, 'crm.organizations.edit')) return { ok: false, error: 'forbidden' };
  const v = validateOrganization(input);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  const { about, ...rest } = v.value;
  return { ok: true, record: { ...rest, ...(about ? { about } : {}), relationship: 'prospect', createdAt: ctx.now }, audit: (id) => auditEvent({ action: 'organization.create', entity: { type: 'organization', id, label: rest.name }, toStatus: 'prospect' }, ctx) };
}

export function updateOrganization(org: CrmOrganization, input: OrganizationInput, ctx: DecisionContext): { ok: true; patch: Partial<CrmOrganization>; event: Audit } | Failure<OrganizationField> {
  if (!allowed(ctx, 'crm.organizations.edit')) return { ok: false, error: 'forbidden' };
  const v = validateOrganization(input);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  return { ok: true, patch: { ...v.value, about: v.value.about || undefined, updatedAt: ctx.now }, event: auditEvent({ action: 'organization.update', entity: { type: 'organization', id: org.id, label: v.value.name } }, ctx) };
}

/** Moves a relationship (prospect → negotiating → active ↔ paused …); permission crm.partners.edit, optional note. */
export function changeRelationship(org: CrmOrganization, to: RelationshipStatus, note: string | undefined, ctx: DecisionContext): { ok: true; patch: Partial<CrmOrganization>; event: Audit } | Failure<never> {
  if (!allowed(ctx, 'crm.partners.edit')) return { ok: false, error: 'forbidden' };
  if (org.relationship === to) return { ok: false, error: 'same-status' };
  return {
    ok: true,
    patch: { relationship: to, relationshipChangedAt: ctx.now },
    event: auditEvent({ action: 'organization.relationship', entity: { type: 'organization', id: org.id, label: org.name }, fromStatus: org.relationship, toStatus: to, reason: note }, ctx),
  };
}

/** Prospective partners (nothing agreed yet) vs active partners. */
export const isProspective = (o: CrmOrganization) => o.relationship === 'prospect' || o.relationship === 'negotiating';

// ---------------------------------------------------------------- interactions

export type InteractionInput = { kind: InteractionKind; at: string; summary: string; contactId: string; organizationId: string; followUpAt: string };
export type InteractionField = keyof InteractionInput;

const validDate = (s: string) => s !== '' && !Number.isNaN(Date.parse(s));

export function logInteraction(input: InteractionInput, contacts: CrmContact[], organizations: CrmOrganization[], ctx: DecisionContext): { ok: true; record: Omit<Interaction, 'id' | 'mock'>; audit: (id: string) => Audit } | Failure<InteractionField> {
  if (!allowed(ctx, 'crm.activity.edit')) return { ok: false, error: 'forbidden' };
  const fields: FieldErrors<InteractionField> = {};
  const summary = clean(input.summary);
  const contact = contacts.find((c) => c.id === input.contactId);
  if (!summary) fields.summary = 'required';
  else if (summary.length > 500) fields.summary = 'too-long';
  if (!validDate(input.at)) fields.at = 'date-invalid';
  if (input.contactId && !contact) fields.contactId = 'unknown-contact';
  if (input.organizationId && !organizations.some((o) => o.id === input.organizationId)) fields.organizationId = 'unknown-organization';
  if (!input.contactId && !input.organizationId) fields.contactId = 'target-required';
  if (input.followUpAt && !validDate(input.followUpAt)) fields.followUpAt = 'date-invalid';
  else if (input.followUpAt && validDate(input.at) && Date.parse(input.followUpAt) <= Date.parse(input.at)) fields.followUpAt = 'follow-up-before';
  if (Object.keys(fields).length > 0) return { ok: false, error: 'invalid', fields };
  // A contact's organization is attached automatically when none was chosen.
  const organizationId = input.organizationId || contact?.organizationId || '';
  const label = summary.length > 60 ? `${summary.slice(0, 57)}…` : summary;
  return {
    ok: true,
    record: {
      kind: input.kind,
      at: new Date(input.at).toISOString(),
      summary,
      ...(input.contactId ? { contactId: input.contactId } : {}),
      ...(organizationId ? { organizationId } : {}),
      authorId: ctx.actor.staffId,
      ...(input.followUpAt ? { followUpAt: new Date(input.followUpAt).toISOString() } : {}),
      createdAt: ctx.now,
    },
    audit: (id) => auditEvent({ action: `interaction.${input.kind}`, entity: { type: 'interaction', id, label } }, ctx),
  };
}

export function completeFollowUp(item: Interaction, ctx: DecisionContext): { ok: true; patch: Partial<Interaction>; event: Audit } | Failure<never> {
  if (!allowed(ctx, 'crm.activity.edit')) return { ok: false, error: 'forbidden' };
  if (!item.followUpAt || item.followUpDone) return { ok: false, error: 'same-status' };
  return { ok: true, patch: { followUpDone: true }, event: auditEvent({ action: 'interaction.follow-up-done', entity: { type: 'interaction', id: item.id, label: item.summary.slice(0, 60) } }, ctx) };
}

// ---------------------------------------------------------------- dashboard

export type FollowUp = { interaction: Interaction; overdue: boolean };

/** Open follow-ups, soonest first; overdue ones are flagged. */
export function openFollowUps(interactions: Interaction[], now: string): FollowUp[] {
  return interactions
    .filter((i) => i.followUpAt && !i.followUpDone)
    .sort((a, b) => a.followUpAt!.localeCompare(b.followUpAt!))
    .map((interaction) => ({ interaction, overdue: interaction.followUpAt! < now }));
}

/** Newest first. */
export function sortByDate(interactions: Interaction[]): Interaction[] {
  return [...interactions].sort((a, b) => b.at.localeCompare(a.at) || b.createdAt.localeCompare(a.createdAt));
}

export type CrmSummary = { activeContacts: number; contacts: number; organizations: number; activePartners: number; prospective: number; interactions30d: number; openFollowUps: number; overdueFollowUps: number };

/** Dashboard figures, counted from the demo records only. */
export function crmSummary(data: Pick<CrmCollections, 'contacts' | 'organizations' | 'interactions'>, now: string): CrmSummary {
  const since = new Date(Date.parse(now) - 30 * 86_400_000).toISOString();
  const follow = openFollowUps(data.interactions, now);
  return {
    activeContacts: data.contacts.filter((c) => c.status === 'active').length,
    contacts: data.contacts.length,
    organizations: data.organizations.length,
    activePartners: data.organizations.filter((o) => o.relationship === 'active').length,
    prospective: data.organizations.filter(isProspective).length,
    interactions30d: data.interactions.filter((i) => i.at >= since && i.at <= now).length,
    openFollowUps: follow.length,
    overdueFollowUps: follow.filter((f) => f.overdue).length,
  };
}
