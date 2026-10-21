import type { ActivityEvent } from '@mmusic/backoffice/domain';
import type { SafeStorage } from '@mmusic/backoffice/storage';

import { DEALS, SEED_M5_EVENTS, TASKS } from './seed-m5.ts';

/** Current CRM demo-data version (M5). */
export const CRM_DATA_VERSION = 3;
export const CRM_DATA_KEY = 'mmusic-crm:data';

type Saved = { version: number; data: Record<string, unknown>; nextId: number };

const isSaved = (v: unknown): v is Saved => !!v && typeof v === 'object' && typeof (v as Saved).version === 'number' && typeof (v as Saved).nextId === 'number' && !!(v as Saved).data && typeof (v as Saved).data === 'object';

/**
 * Documented migration M4 → M5 (data version 2 → 3): everything saved in M4 (contacts, organizations, interactions
 * and the change log, including local edits) is kept as is; the M5 demo deals and tasks and their seed history are
 * added. Returns undefined when nothing must change (no data, other versions, or a broken shape — the back-office
 * data source then falls back to the seed as before).
 */
export function migrateCrmData(saved: unknown): Saved | undefined {
  if (!isSaved(saved) || saved.version !== 2) return undefined;
  const { contacts, organizations, interactions, activity } = saved.data;
  if (![contacts, organizations, interactions, activity].every(Array.isArray)) return undefined;
  const events = activity as ActivityEvent[];
  const known = new Set(events.map((e) => e.id));
  return {
    version: CRM_DATA_VERSION,
    nextId: saved.nextId,
    data: { ...saved.data, deals: structuredClone(DEALS), tasks: structuredClone(TASKS), activity: [...events, ...structuredClone(SEED_M5_EVENTS).filter((e) => !known.has(e.id))] },
  };
}

/** Applies the migration to the browser storage before the CRM data source reads it. */
export function migrateStoredCrmData(storage: SafeStorage): boolean {
  const next = migrateCrmData(storage.getJSON<unknown>(CRM_DATA_KEY));
  return next ? storage.setJSON(CRM_DATA_KEY, next) : false;
}
