import type { ActivityEvent, Contact, Entity, Localized, Organization } from '@mmusic/backoffice/domain';

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

/**
 * Entity type of a CRM organization (unified CRM): a music group / band, a record label, an agency, an event organizer
 * (venues, festivals), a media outlet, a company or another organization. A music group is a creative collective — it
 * is not assumed to be a registered legal entity. Older saved types are mapped by the migration (`crmOrgKind`), which
 * keeps the original type in `formerKind`.
 */
export type CrmOrgKind = 'group' | 'label' | 'agency' | 'event-organizer' | 'media' | 'company' | 'other';
export const CRM_ORG_KINDS: readonly CrmOrgKind[] = ['group', 'label', 'agency', 'event-organizer', 'media', 'company', 'other'];

/** A member of a music group: a reference to one artist record (never a copy), with the member's role in the group. */
export type GroupMember = { artistId: string; role: string; joinedAt: string };

/** A fictional organization or music group; extends the shared back-office Organization with the CRM entity type. */
export type CrmOrganization = Omit<Organization, 'kind'> & {
  kind: CrmOrgKind;
  /** Music groups only: members (artist references) and their roles. */
  members?: GroupMember[];
  /** The organization type before the unified CRM (e.g. 'sponsor'), kept by the migration; never edited. */
  formerKind?: string;
  relationship: RelationshipStatus;
  relationshipChangedAt?: string;
  /** Short internal description of what the organization does (fictional). */
  about?: string;
  /** Fictional tags (M6). */
  tags?: string[];
  updatedAt?: string;
};

/**
 * A fictional solo artist (unified CRM). The same record is referenced by every music group the artist belongs to,
 * so a person who plays in a group is never stored twice. Collaboration status reuses the relationship scale.
 */
export type CrmArtist = Entity & {
  stageName: string;
  /** Optional; demo records leave it empty. */
  legalName?: string;
  /** Profile image as a small data URL kept in this browser (demo records use generated initials). */
  avatar?: string;
  genres: string[];
  city: string;
  email?: string;
  phone?: string;
  /** Manager or representative: a CRM contact. */
  managerContactId?: string;
  collaboration: RelationshipStatus;
  collaborationChangedAt?: string;
  notes?: string;
  createdAt: string;
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
  /** Unified CRM: the solo artist the interaction was with. */
  artistId?: string;
  /** Demo staff member (StaffUser.id) who logged it. */
  authorId: string;
  /** Optional follow-up reminder (shown on the dashboard until marked done). */
  followUpAt?: string;
  followUpDone?: boolean;
  createdAt: string;
};

/**
 * A pipeline stage id (stable, never a translated label). Defaults [П, provisional — OQ-55]: lead → qualified →
 * proposal → negotiation, then the two system stages `won` (both sides agreed to proceed; no contract is recorded)
 * and `lost` (reason required). Since M6 open stages are configurable in Settings (labels, order, enabled, custom
 * stages with ids `stage-<n>`); `won` and `lost` always exist.
 */
export type DealStage = string;
export const DEFAULT_OPEN_STAGES: readonly DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation'];
export const CLOSED_STAGES: readonly DealStage[] = ['won', 'lost'];
export type DealOutcome = 'open' | 'won' | 'lost';

/** Configuration of one pipeline stage (M6). `order` sorts the open stages; system stages stay last. */
export type StageConfig = Entity & {
  kind: DealOutcome;
  label: Localized;
  enabled: boolean;
  order: number;
  /** Custom stages added in Settings (deletable while unused); the defaults and won / lost are built in. */
  custom?: boolean;
};

/** A fictional tag usable on contacts and organizations (M6 registry; also lists tags typed in forms). */
export type TagRecord = Entity & { name: string; createdAt: string };

/** CRM preferences of this browser's prototype (id 'prefs'). The interface language lives in the shell. */
export type CrmPreferences = Entity & {
  dealsView: 'board' | 'list';
  agendaSize: number;
  taskPriority: TaskPriority;
  updatedAt?: string;
};

/** Editable permissions of one prototype role (id = role id), browser-local only — not access control. */
export type RoleConfig = Entity & { permissions: string[]; updatedAt?: string };

/** Demo role assignment of a CRM staff member (id = StaffUser.id). */
export type StaffAssignment = Entity & { roleId: string; updatedAt?: string };

/**
 * A fictional partnership opportunity with exactly one counterparty: an organization / music group or (unified CRM)
 * a solo artist. The value is a fictional estimate, not revenue.
 */
export type Deal = Entity & {
  title: string;
  organizationId?: string;
  artistId?: string;
  /**
   * Optional secondary participant (e.g. the label of an artist deal): at most one, an organization or an artist,
   * never the primary counterparty again. The pipeline, stage and owner stay with the one deal record.
   */
  secondaryOrganizationId?: string;
  secondaryArtistId?: string;
  /** Optional contact person (must belong to the organization when the deal is with one). */
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

/** A CRM task for a staff member, optionally about a contact, an organization, an artist and/or a deal. Reminders stay in-app. */
export type Task = Entity & {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueAt?: string;
  contactId?: string;
  organizationId?: string;
  /** Unified CRM: the solo artist the task is about. */
  artistId?: string;
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
  artists: CrmArtist[];
  interactions: Interaction[];
  deals: Deal[];
  tasks: Task[];
  pipeline: StageConfig[];
  tags: TagRecord[];
  preferences: CrmPreferences[];
  roles: RoleConfig[];
  staffRoles: StaffAssignment[];
  /** Audit trail of CRM changes (create / edit / status / link). */
  activity: ActivityEvent[];
};
