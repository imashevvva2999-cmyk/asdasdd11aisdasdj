import type { ActivityEvent } from '@mmusic/backoffice/domain';
import type { SafeStorage } from '@mmusic/backoffice/storage';

import { DEALS, SEED_M5_EVENTS, TASKS } from './seed-m5.ts';
import { defaultM6Data } from './seed-m6.ts';

/** Current CRM demo-data version (M6). */
export const CRM_DATA_VERSION = 4;
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
  return current?.version === CRM_DATA_VERSION ? current : undefined;
}

/** Applies the migration to the browser storage before the CRM data source reads it. */
export function migrateStoredCrmData(storage: SafeStorage): boolean {
  const next = migrateCrmData(storage.getJSON<unknown>(CRM_DATA_KEY));
  return next ? storage.setJSON(CRM_DATA_KEY, next) : false;
}
