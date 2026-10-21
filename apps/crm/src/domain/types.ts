import type { ActivityEvent, Contact, Entity, Organization } from '@mmusic/backoffice/domain';

/**
 * CRM data (M4). All records are fictional demo data (`mock: true`): invented people at invented companies, with
 * reserved example.* e-mail domains and +996 555 000 0xx numbers. CRM describes relationships only — no agreements,
 * contract terms, money or business results are stored anywhere.
 */

export type ContactStatus = 'active' | 'inactive';

/** A fictional person; extends the shared back-office Contact. */
export type CrmContact = Contact & {
  status: ContactStatus;
  updatedAt?: string;
};

/**
 * Where a relationship with an organization stands [П]: `prospect` — a potential partner, nothing agreed;
 * `negotiating` — talks in progress; `active` — an active partner; `paused` — the relationship is on hold.
 * The status says nothing about agreement terms (none are recorded).
 */
export type RelationshipStatus = 'prospect' | 'negotiating' | 'active' | 'paused';
export const RELATIONSHIP_STATUSES: readonly RelationshipStatus[] = ['prospect', 'negotiating', 'active', 'paused'];

/** A fictional company; extends the shared back-office Organization. */
export type CrmOrganization = Organization & {
  relationship: RelationshipStatus;
  relationshipChangedAt?: string;
  /** Short internal description of what the organization does (fictional). */
  about?: string;
  updatedAt?: string;
};

export type InteractionKind = 'meeting' | 'call' | 'email' | 'note';
export const INTERACTION_KINDS: readonly InteractionKind[] = ['meeting', 'call', 'email', 'note'];

/** A manually logged interaction (meeting, call, e-mail or note) with a contact and/or an organization. */
export type Interaction = Entity & {
  kind: InteractionKind;
  /** When it happened. */
  at: string;
  summary: string;
  contactId?: string;
  organizationId?: string;
  /** Demo staff member (StaffUser.id) who logged it. */
  authorId: string;
  /** Optional follow-up reminder (shown on the dashboard until marked done). */
  followUpAt?: string;
  followUpDone?: boolean;
  createdAt: string;
};

export type CrmCollections = {
  contacts: CrmContact[];
  organizations: CrmOrganization[];
  interactions: Interaction[];
  /** Audit trail of CRM changes (create / edit / status / link). */
  activity: ActivityEvent[];
};
