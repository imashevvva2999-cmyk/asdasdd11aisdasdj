import type { SafeStorage } from '@mmusic/backoffice/storage';

import { defaultM6Data } from './settings.ts';

/** Current ARM demo-data version (M6). */
export const ARM_DATA_VERSION = 5;
export const ARM_DATA_KEY = 'mmusic-arm:data';

type Saved = { version: number; data: Record<string, unknown>; nextId: number };

const isSaved = (v: unknown): v is Saved => !!v && typeof v === 'object' && typeof (v as Saved).version === 'number' && typeof (v as Saved).nextId === 'number' && !!(v as Saved).data && typeof (v as Saved).data === 'object';

/**
 * M3 → M6 (v4 → v5): keeps every saved record (submissions incl. sub-demo-horizon, artists, users, campaigns,
 * transactions, the activity log and every local decision); only adds the default role matrix, staff roles and
 * settings. Returns undefined when nothing must change (no data, the current version, a broken shape, or a version
 * before v4 — the back-office data source then re-seeds, as it already did for v2 / v3 data in M3).
 */
export function migrateArmData(saved: unknown): Saved | undefined {
  if (!isSaved(saved) || saved.version !== 4) return undefined;
  const { submissions, artists, users, campaigns, transactions, activity } = saved.data;
  if (![submissions, artists, users, campaigns, transactions, activity].every(Array.isArray)) return undefined;
  return { version: ARM_DATA_VERSION, nextId: saved.nextId, data: { ...defaultM6Data(), ...saved.data } };
}

/** Applies the migration to the browser storage before the ARM data source reads it. */
export function migrateStoredArmData(storage: SafeStorage): boolean {
  const next = migrateArmData(storage.getJSON<unknown>(ARM_DATA_KEY));
  return next ? storage.setJSON(ARM_DATA_KEY, next) : false;
}
