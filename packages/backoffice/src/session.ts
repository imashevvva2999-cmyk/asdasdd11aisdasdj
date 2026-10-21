import { createStore, type StoreApi } from 'zustand/vanilla';

import type { RoleDefinition } from './rbac.ts';
import type { SafeStorage } from './storage.ts';

/**
 * The development-only role session: which provisional role the prototype is viewed as. Remembered per app; an
 * unknown or foreign saved role falls back to the app's first role. Not authentication.
 */
export type SessionState = { roleId: string; setRole: (roleId: string) => void };

export function createSessionStore(storage: SafeStorage, key: string, roles: readonly RoleDefinition[]): StoreApi<SessionState> {
  const saved = storage.getJSON<unknown>(key);
  const initial = roles.find((r) => r.id === saved)?.id ?? roles[0]?.id ?? '';
  return createStore<SessionState>((set) => ({
    roleId: initial,
    setRole: (roleId) => {
      if (!roles.some((r) => r.id === roleId)) return;
      storage.setJSON(key, roleId);
      set({ roleId });
    },
  }));
}
