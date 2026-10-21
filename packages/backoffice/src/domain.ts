/**
 * Back-office domain types shared by ARM and CRM (M1: the entities the foundation needs). Every prototype record
 * carries `mock: true` — the UI labels such data as demo, and future backend records simply omit the flag.
 */

export type Locale = 'ru' | 'en';
export type AppId = 'arm' | 'crm';

/** Text in both interface languages. */
export type Localized = Record<Locale, string>;

/** A stored record; `mock` marks fictional prototype data. */
export type Entity = { id: string; mock: true };

/** A fictional staff member (role switcher, activity authors). */
export type StaffUser = Entity & {
  name: string;
  email: string;
  title: Localized;
  app: AppId;
  roleId: string;
};

export type OrganizationKind = 'label' | 'venue' | 'sponsor' | 'media' | 'agency' | 'bank-unit';

/** A fictional company (CRM). */
export type Organization = Entity & {
  name: string;
  kind: OrganizationKind;
  city: string;
  createdAt: string;
};

/** A fictional person at a company (CRM). */
export type Contact = Entity & {
  name: string;
  position: Localized;
  organizationId?: string;
  email: string;
  phone: string;
  tags: string[];
  createdAt: string;
};

/**
 * One audit event: what was done (`action`, e.g. 'track.reject'), to which entity, the status change, the acting
 * demo staff member and their role, when, and the reason when one is required. Written by every state-changing
 * action of the back-office apps; never edited afterwards.
 */
export type ActivityEvent = Entity & {
  at: string;
  /** Demo staff member (StaffUser.id) acting under the dev role switcher. */
  actorId: string;
  actorRoleId: string;
  action: string;
  entity: { type: string; id: string; label: string };
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
};
