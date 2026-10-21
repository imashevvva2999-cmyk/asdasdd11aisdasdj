import type { ActivityEvent } from '@mmusic/backoffice/domain';
import type { SafeStorage } from '@mmusic/backoffice/storage';

import { crmOrgKind, LEGACY_KINDS } from './artists.ts';
import { CRM_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, type CrmRoleId } from './permissions.ts';
import { unifiedSeed } from './seed-artists.ts';
import { DEALS, SEED_M5_EVENTS, TASKS } from './seed-m5.ts';
import { defaultM6Data } from './seed-m6.ts';

/** Current CRM demo-data version (unified CRM: artists, groups, media type, secondary deal participants). */
export const CRM_DATA_VERSION = 6;
export const CRM_DATA_KEY = 'mmusic-crm:data';

type Saved = { version: number; data: Record<string, unknown>; nextId: number };

const isSaved = (v: unknown): v is Saved => !!v && typeof v === 'object' && typeof (v as Saved).version === 'number' && typeof (v as Saved).nextId === 'number' && !!(v as Saved).data && typeof (v as Saved).data === 'object';

/** M4 → M5 (v2 → v3): keeps every saved record; adds the M5 demo deals, tasks and their seed history. */
function v2ToV3(saved: Saved): Saved | undefined {
  const { contacts, organizations, interactions, activity } = saved.data;
  if (![contacts, organizations, interactions, activity].every(Array.isArray)) return undefined;
  const events = activity as ActivityEvent[];
  const known = new Set(events.map((e) => e.id));
  return { version: 3, nextId: saved.nextId, data: { ...saved.data, deals: structuredClone(DEALS), tasks: structuredClone(TASKS), activity: [...events, ...structuredClone(SEED_M5_EVENTS).filter((e) => !known.has(e.id))] } };
}

/**
 * M5 → M6 (v3 → v4): keeps every saved record (contacts, organizations, interactions, deals, tasks, change log and
 * local edits); adds the default settings (pipeline, tags, preferences) and the default role matrix and staff roles.
 * Stages of saved deals that are not in the default pipeline are kept as enabled custom stages, so nothing breaks.
 */
function v3ToV4(saved: Saved): Saved | undefined {
  const { contacts, organizations, interactions, activity, deals, tasks } = saved.data;
  if (![contacts, organizations, interactions, activity, deals, tasks].every(Array.isArray)) return undefined;
  const m6 = defaultM6Data();
  const known = new Set(m6.pipeline.map((s) => s.id));
  const unknown = [...new Set((deals as { stage: string }[]).map((d) => d.stage))].filter((id) => !known.has(id));
  const extra = unknown.map((id, i) => ({ id, mock: true as const, kind: 'open' as const, label: { ru: id, en: id }, enabled: true, order: 50 + i, custom: true }));
  return { version: 4, nextId: saved.nextId, data: { ...m6, pipeline: [...m6.pipeline, ...extra], ...saved.data } };
}

const ARTIST_RIGHTS = ['crm.artists.view', 'crm.artists.edit'];

type SavedOrg = { id: string; kind: string; name?: string; about?: string; tags?: string[]; formerKind?: string };
/** Unified type from what the record describes; a legacy type is kept verbatim in `formerKind`. */
const unifiedOrg = (o: SavedOrg) => ({ ...o, kind: crmOrgKind(o.kind, o), ...((LEGACY_KINDS as readonly string[]).includes(o.kind) && !o.formerKind ? { formerKind: o.kind } : {}) });

/**
 * M6 → unified CRM (v4 → v6): keeps every saved record and local edit. Organization types are mapped to the unified
 * types (label, agency, media kept; venue → event organizer; sponsor → event organizer only when the record describes
 * a festival, otherwise company; bank unit → company; the legacy type is kept in `formerKind`); the fictional artists, music groups and their linked demo deals, tasks, interactions and
 * group contact are added when their ids are free; each saved role gets its default artist rights, all other rights
 * (including local matrix edits) stay as they were.
 */
function v4ToV6(saved: Saved): Saved | undefined {
  const { contacts, organizations, interactions, activity, deals, tasks, roles } = saved.data;
  if (![contacts, organizations, interactions, activity, deals, tasks, roles].every(Array.isArray)) return undefined;
  const seed = unifiedSeed();
  const add = <T extends { id: string }>(items: T[], extra: T[]) => [...items, ...extra.filter((e) => !items.some((i) => i.id === e.id))];
  const orgs = (organizations as SavedOrg[]).map(unifiedOrg);
  const withRights = (roles as { id: string; permissions: string[] }[]).map((r) => {
    const defaults = DEFAULT_ROLE_PERMISSIONS[r.id as CrmRoleId];
    if (!defaults) return r;
    const next = new Set([...r.permissions, ...ARTIST_RIGHTS.filter((p) => (defaults as readonly string[]).includes(p))]);
    return { ...r, permissions: CRM_PERMISSION_KEYS.filter((p) => next.has(p)) };
  });
  return {
    version: 6,
    nextId: saved.nextId,
    data: {
      ...saved.data,
      organizations: add(orgs, seed.groups),
      artists: Array.isArray(saved.data.artists) ? saved.data.artists : seed.artists,
      contacts: add(contacts as { id: string }[], seed.contacts),
      deals: add(deals as { id: string }[], seed.deals),
      tasks: add(tasks as { id: string }[], seed.tasks),
      interactions: add(interactions as { id: string }[], seed.interactions),
      roles: withRights,
    },
  };
}

/**
 * v5 existed only in the pre-approval preview of the unified CRM (media and sponsors were stored as companies). It
 * keeps everything and restores the media / festival types from what each record describes.
 */
function v5ToV6(saved: Saved): Saved | undefined {
  const { organizations } = saved.data;
  if (!Array.isArray(organizations)) return undefined;
  return { version: 6, nextId: saved.nextId, data: { ...saved.data, organizations: (organizations as SavedOrg[]).map(unifiedOrg) } };
}

/**
 * Documented migrations of saved CRM data, applied in order up to the current version. Everything saved before is
 * kept; only the new collections are added. Returns undefined when nothing must change (no data, the current
 * version, or a broken shape — the back-office data source then falls back to the seed as before).
 */
export function migrateCrmData(saved: unknown): Saved | undefined {
  if (!isSaved(saved) || saved.version >= CRM_DATA_VERSION || saved.version < 2) return undefined;
  let current: Saved | undefined = saved;
  if (current.version === 2) current = v2ToV3(current);
  if (current?.version === 3) current = v3ToV4(current);
  if (current?.version === 4) current = v4ToV6(current);
  else if (current?.version === 5) current = v5ToV6(current);
  return current?.version === CRM_DATA_VERSION ? current : undefined;
}

/** Applies the migration to the browser storage before the CRM data source reads it. */
export function migrateStoredCrmData(storage: SafeStorage): boolean {
  const next = migrateCrmData(storage.getJSON<unknown>(CRM_DATA_KEY));
  return next ? storage.setJSON(CRM_DATA_KEY, next) : false;
}
