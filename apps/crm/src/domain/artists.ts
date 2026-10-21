import { audit, type CrmContext } from './permissions.ts';
import { allowed, clean, DEMO_EMAIL, DEMO_PHONE, type Audit, type Failure, type FieldErrors } from './rules.ts';
import type { CrmArtist, CrmContact, CrmOrgKind, CrmOrganization, GroupMember, RelationshipStatus } from './types.ts';

/**
 * Unified CRM: solo artists and music-group membership as pure rules — validation, the (prototype) permission checks
 * (crm.artists.edit for artists, crm.partners.edit for the collaboration status, crm.organizations.edit for group
 * members, which belong to the group record) and the audit event of each change. A group member is a reference to an
 * artist record, so the same person is never stored twice.
 */

/** What the record says about itself (name, description, tags), for mapping legacy types without guessing. */
const describes = (o: { name?: string; about?: string; tags?: string[] }, words: RegExp) => words.test([o.name, o.about, ...(o.tags ?? [])].join(' '));
const FESTIVAL = /фестивал|festival/i;
const MEDIA = /медиа|подкаст|журнал|радио|media|podcast|magazine|radio/i;
const KINDS = new Set<string>(['group', 'label', 'agency', 'event-organizer', 'media', 'company', 'other']);

/**
 * Organization types before the unified CRM → its entity types: label, agency and media stay; a venue organizes
 * events; a sponsor becomes an event organizer only when its record describes a festival, otherwise a company; a bank
 * unit is a company. `company` records from the pre-approval preview that describe media or a festival are restored.
 */
export function crmOrgKind(kind: string, record: { name?: string; about?: string; tags?: string[] } = {}): CrmOrgKind {
  if (kind === 'venue') return 'event-organizer';
  if (kind === 'sponsor') return describes(record, FESTIVAL) ? 'event-organizer' : 'company';
  if (kind === 'bank-unit') return 'company';
  if (kind === 'company' && describes(record, MEDIA)) return 'media';
  if (kind === 'company' && describes(record, FESTIVAL)) return 'event-organizer';
  return KINDS.has(kind) ? (kind as CrmOrgKind) : 'other';
}

/** Legacy organization types kept as `formerKind` (shown on the record as its type before the unified CRM). */
export const LEGACY_KINDS = ['venue', 'sponsor', 'bank-unit'] as const;

/** Groups the artist belongs to (one artist record, any number of groups). */
export const groupsOf = (artistId: string, organizations: CrmOrganization[]) => organizations.filter((o) => o.kind === 'group' && o.members?.some((m) => m.artistId === artistId));

const MAX_AVATAR = 200_000;
const AVATAR = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
/** Same stage name regardless of case and spacing = the same artist. */
const sameName = (a: string, b: string) => a.replace(/\s+/g, ' ').trim().toLocaleLowerCase() === b.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
/** Comma-separated genres; repeats (any case) are dropped, the first spelling is kept. */
export const parseGenres = (text: string) =>
  text
    .split(',')
    .map((g) => g.trim().replace(/\s+/g, ' '))
    .filter((g, i, all) => g && all.findIndex((x) => x.toLocaleLowerCase() === g.toLocaleLowerCase()) === i);

export type ArtistInput = { stageName: string; legalName: string; avatar: string; genres: string; city: string; email: string; phone: string; managerContactId: string; notes: string };
export type ArtistField = keyof ArtistInput;
type ArtistValue = Omit<CrmArtist, 'id' | 'mock' | 'collaboration' | 'collaborationChangedAt' | 'createdAt' | 'updatedAt'>;

export function artistInput(a?: CrmArtist): ArtistInput {
  return { stageName: a?.stageName ?? '', legalName: a?.legalName ?? '', avatar: a?.avatar ?? '', genres: a?.genres.join(', ') ?? '', city: a?.city ?? '', email: a?.email ?? '', phone: a?.phone ?? '', managerContactId: a?.managerContactId ?? '', notes: a?.notes ?? '' };
}

/** `selfId`: the artist being edited (excluded from the duplicate check). */
export function validateArtist(input: ArtistInput, artists: CrmArtist[], contacts: CrmContact[], selfId?: string): { ok: true; value: ArtistValue } | { ok: false; fields: FieldErrors<ArtistField> } {
  const fields: FieldErrors<ArtistField> = {};
  const stageName = clean(input.stageName);
  const email = clean(input.email).toLowerCase();
  const phone = clean(input.phone);
  const genres = parseGenres(input.genres);
  if (!stageName) fields.stageName = 'required';
  else if (stageName.length > 80) fields.stageName = 'too-long';
  else if (artists.some((a) => a.id !== selfId && sameName(a.stageName, stageName))) fields.stageName = 'duplicate';
  if (clean(input.legalName).length > 120) fields.legalName = 'too-long';
  if (input.avatar && (!AVATAR.test(input.avatar) || input.avatar.length > MAX_AVATAR)) fields.avatar = 'image-invalid';
  if (genres.length === 0) fields.genres = 'required';
  else if (genres.length > 6 || genres.some((g) => g.length > 40)) fields.genres = 'too-long';
  if (!clean(input.city)) fields.city = 'required';
  if (email && !DEMO_EMAIL.test(email)) fields.email = 'email-not-demo';
  if (phone && !DEMO_PHONE.test(phone)) fields.phone = 'phone-not-demo';
  if (input.managerContactId && !contacts.some((c) => c.id === input.managerContactId)) fields.managerContactId = 'unknown-contact';
  if (clean(input.notes).length > 500) fields.notes = 'too-long';
  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return {
    ok: true,
    value: {
      stageName,
      legalName: clean(input.legalName) || undefined,
      avatar: input.avatar || undefined,
      genres,
      city: clean(input.city),
      email: email || undefined,
      phone: phone || undefined,
      managerContactId: input.managerContactId || undefined,
      notes: clean(input.notes) || undefined,
    },
  };
}

const compact = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** New artists start as prospects; the collaboration status changes separately (crm.partners.edit). */
export function createArtist(input: ArtistInput, artists: CrmArtist[], contacts: CrmContact[], ctx: CrmContext): { ok: true; record: Omit<CrmArtist, 'id' | 'mock'>; audit: (id: string) => Audit } | Failure<ArtistField> {
  if (!allowed(ctx, 'crm.artists.edit')) return { ok: false, error: 'forbidden' };
  const v = validateArtist(input, artists, contacts);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  return { ok: true, record: compact({ ...v.value, collaboration: 'prospect' as const, createdAt: ctx.now }), audit: (id) => audit({ action: 'artist.create', entity: { type: 'artist', id, label: v.value.stageName }, toStatus: 'prospect' }, ctx) };
}

export function updateArtist(artist: CrmArtist, input: ArtistInput, artists: CrmArtist[], contacts: CrmContact[], ctx: CrmContext): { ok: true; patch: Partial<CrmArtist>; event: Audit } | Failure<ArtistField> {
  if (!allowed(ctx, 'crm.artists.edit')) return { ok: false, error: 'forbidden' };
  const v = validateArtist(input, artists, contacts, artist.id);
  if (!v.ok) return { ok: false, error: 'invalid', fields: v.fields };
  return { ok: true, patch: { ...v.value, updatedAt: ctx.now }, event: audit({ action: 'artist.update', entity: { type: 'artist', id: artist.id, label: v.value.stageName } }, ctx) };
}

/** Collaboration status of an artist (same scale and permission as an organization's relationship), optional note. */
export function changeCollaboration(artist: CrmArtist, to: RelationshipStatus, note: string | undefined, ctx: CrmContext): { ok: true; patch: Partial<CrmArtist>; event: Audit } | Failure<never> {
  if (!allowed(ctx, 'crm.partners.edit')) return { ok: false, error: 'forbidden' };
  if (artist.collaboration === to) return { ok: false, error: 'same-status' };
  return {
    ok: true,
    patch: { collaboration: to, collaborationChangedAt: ctx.now },
    event: audit({ action: 'artist.collaboration', entity: { type: 'artist', id: artist.id, label: artist.stageName }, fromStatus: artist.collaboration, toStatus: to, reason: clean(note) || undefined }, ctx),
  };
}

// ---------------------------------------------------------------- group members

export type MemberField = 'artistId' | 'role';
type MemberResult = { ok: true; patch: Pick<CrmOrganization, 'members' | 'updatedAt'>; event: Audit } | Failure<MemberField>;

const memberRole = (role: string): FieldErrors<MemberField> => (!clean(role) ? { role: 'required' } : clean(role).length > 40 ? { role: 'too-long' } : {});

/** Adds an existing artist to a music group with a role (e.g. "вокал"); the artist record itself is not copied. */
export function addMember(group: CrmOrganization, artistId: string, role: string, artists: CrmArtist[], ctx: CrmContext): MemberResult {
  if (!allowed(ctx, 'crm.organizations.edit')) return { ok: false, error: 'forbidden' };
  if (group.kind !== 'group') return { ok: false, error: 'not-group' };
  const artist = artists.find((a) => a.id === artistId);
  const fields: FieldErrors<MemberField> = { ...(!artistId ? { artistId: 'required' as const } : !artist ? { artistId: 'unknown-artist' as const } : group.members?.some((m) => m.artistId === artistId) ? { artistId: 'duplicate' as const } : {}), ...memberRole(role) };
  if (Object.keys(fields).length > 0 || !artist) return { ok: false, error: 'invalid', fields };
  const member: GroupMember = { artistId, role: clean(role), joinedAt: ctx.now };
  return { ok: true, patch: { members: [...(group.members ?? []), member], updatedAt: ctx.now }, event: audit({ action: 'organization.member-add', entity: { type: 'organization', id: group.id, label: group.name }, reason: `${artist.stageName} — ${member.role}` }, ctx) };
}

export function changeMemberRole(group: CrmOrganization, artistId: string, role: string, artists: CrmArtist[], ctx: CrmContext): MemberResult {
  if (!allowed(ctx, 'crm.organizations.edit')) return { ok: false, error: 'forbidden' };
  const current = group.members?.find((m) => m.artistId === artistId);
  if (!current) return { ok: false, error: 'not-found' };
  const fields = memberRole(role);
  if (Object.keys(fields).length > 0) return { ok: false, error: 'invalid', fields };
  if (current.role === clean(role)) return { ok: false, error: 'same-status' };
  const name = artists.find((a) => a.id === artistId)?.stageName ?? artistId;
  return {
    ok: true,
    patch: { members: group.members!.map((m) => (m.artistId === artistId ? { ...m, role: clean(role) } : m)), updatedAt: ctx.now },
    event: audit({ action: 'organization.member-role', entity: { type: 'organization', id: group.id, label: group.name }, reason: `${name}: ${current.role} → ${clean(role)}` }, ctx),
  };
}

export function removeMember(group: CrmOrganization, artistId: string, artists: CrmArtist[], ctx: CrmContext): MemberResult {
  if (!allowed(ctx, 'crm.organizations.edit')) return { ok: false, error: 'forbidden' };
  const current = group.members?.find((m) => m.artistId === artistId);
  if (!current) return { ok: false, error: 'not-found' };
  const name = artists.find((a) => a.id === artistId)?.stageName ?? artistId;
  return { ok: true, patch: { members: group.members!.filter((m) => m.artistId !== artistId), updatedAt: ctx.now }, event: audit({ action: 'organization.member-remove', entity: { type: 'organization', id: group.id, label: group.name }, reason: `${name} — ${current.role}` }, ctx) };
}
