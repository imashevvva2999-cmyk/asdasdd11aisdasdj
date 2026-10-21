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

/**
 * Pipeline stages [П, provisional — OQ-55 is open]: lead → qualified → proposal → negotiation, then closed as won
 * (both sides agreed to proceed; no contract is recorded) or lost (reason required).
 */
export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export const OPEN_STAGES: readonly DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation'];
export const DEAL_STAGES: readonly DealStage[] = [...OPEN_STAGES, 'won', 'lost'];
export type DealOutcome = 'open' | 'won' | 'lost';

/** A fictional partnership opportunity with an organization. The value is a fictional estimate, not revenue. */
export type Deal = Entity & {
  title: string;
  organizationId: string;
  /** Optional contact person (must belong to the organization). */
  contactId?: string;
  /** Responsible CRM staff member (StaffUser.id). */
  ownerId: string;
  stage: DealStage;
  /** Fictional estimate in KGS — never revenue, never a contract amount. */
  estimatedValueKgs?: number;
  /** Expected decision date (date only, ISO). */
  expectedCloseAt?: string;
  description?: string;
  lostReason?: string;
  closedAt?: string;
  stageChangedAt: string;
  createdAt: string;
  updatedAt?: string;
};

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';
export const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'in-progress', 'completed', 'cancelled'];
export type TaskPriority = 'low' | 'normal' | 'high';
export const TASK_PRIORITIES: readonly TaskPriority[] = ['high', 'normal', 'low'];

/** A CRM task for a staff member, optionally about a contact, an organization and/or a deal. Reminders stay in-app. */
export type Task = Entity & {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueAt?: string;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
  /** Latest completion (the full history is in the change log). */
  completedAt?: string;
  completedBy?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt?: string;
};

export type CrmCollections = {
  contacts: CrmContact[];
  organizations: CrmOrganization[];
  interactions: Interaction[];
  deals: Deal[];
  tasks: Task[];
  /** Audit trail of CRM changes (create / edit / status / link). */
  activity: ActivityEvent[];
};
