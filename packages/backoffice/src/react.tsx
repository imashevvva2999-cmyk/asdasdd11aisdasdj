import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';

import { createMockDataSource, type Collections, type MockDataSource } from './data.ts';
import type { AppId, Entity, Locale, Localized, StaffUser } from './domain.ts';
import { createLocaleStore, SHELL_STRINGS, type LocaleState, type ShellStringKey, type StringTable } from './i18n.ts';
import { buildMatrix, can, DEFAULT_ROLES, rolesFor, withOverrides, type Permission, type PermissionMatrix, type RoleDefinition, type RoleOverrides } from './rbac.ts';
import { createSessionStore, type SessionState } from './session.ts';
import { createSafeStorage, type SafeStorage } from './storage.ts';

export type { SessionState };

/**
 * One back-office app instance (ARM or CRM): its own storage namespace, mock data source, locale and the
 * development-only role session. Apps create it once in main.tsx and provide it to the shell and their pages.
 */
export type Backoffice = {
  app: AppId;
  appName: Localized;
  storage: SafeStorage;
  data: MockDataSource<Collections>;
  locale: StoreApi<LocaleState>;
  session: StoreApi<SessionState>;
  roles: RoleDefinition[];
  matrix: PermissionMatrix;
  staff: StaffUser[];
};

export type BackofficeOptions<C extends Collections> = {
  app: AppId;
  appName: Localized;
  /** Storage namespace, e.g. 'mmusic-arm' (keys: `${ns}:data`, `${ns}:locale`, `${ns}:dev-role`). */
  namespace: string;
  dataVersion: number;
  seed: () => C;
  staff: StaffUser[];
  /** Configurable permission matrix: grant / revoke per role on top of the provisional defaults. */
  overrides?: RoleOverrides;
  /** Injected in tests; the page's localStorage otherwise. */
  storage?: SafeStorage;
};

export function createBackoffice<C extends Collections>(options: BackofficeOptions<C>): Backoffice {
  const storage = options.storage ?? createSafeStorage();
  const roles = rolesFor(options.app, withOverrides(DEFAULT_ROLES, options.overrides ?? {}));
  return {
    app: options.app,
    appName: options.appName,
    storage,
    data: createMockDataSource({ namespace: options.namespace, version: options.dataVersion, seed: options.seed, storage }) as unknown as MockDataSource<Collections>,
    locale: createLocaleStore(storage, `${options.namespace}:locale`),
    session: createSessionStore(storage, `${options.namespace}:dev-role`, roles),
    roles,
    matrix: buildMatrix(roles),
    staff: options.staff.filter((s) => s.app === options.app),
  };
}

const BackofficeContext = createContext<Backoffice | null>(null);

export function BackofficeProvider({ value, children }: { value: Backoffice; children: ReactNode }) {
  const locale = useStore(value.locale, (s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <BackofficeContext.Provider value={value}>{children}</BackofficeContext.Provider>;
}

export function useBackoffice(): Backoffice {
  const value = useContext(BackofficeContext);
  if (!value) throw new Error('useBackoffice must be used inside <BackofficeProvider>');
  return value;
}

export function useLocale(): Locale {
  return useStore(useBackoffice().locale, (s) => s.locale);
}

/** Text from an app's own RU/EN table. */
export function useT<K extends string>(table: StringTable<K>): (key: K) => string {
  const locale = useLocale();
  return (key) => table[locale][key];
}

export function useShellStrings(): (key: ShellStringKey) => string {
  return useT(SHELL_STRINGS);
}

/** Picks the current language from a { ru, en } value. */
export function useLocalized(): (value: Localized) => string {
  const locale = useLocale();
  return (value) => value[locale];
}

export function useRole(): RoleDefinition | undefined {
  const bo = useBackoffice();
  const roleId = useStore(bo.session, (s) => s.roleId);
  return bo.roles.find((r) => r.id === roleId);
}

export function useCan(permission: Permission): boolean {
  const bo = useBackoffice();
  const roleId = useStore(bo.session, (s) => s.roleId);
  return can(bo.matrix, roleId, permission);
}

/** Renders children only when the current role has the permission. */
export function Can({ permission, children, fallback = null }: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  return useCan(permission) ? children : fallback;
}

/** A collection of the app's mock data, re-rendering on change. */
export function useCollection<T extends Entity>(name: string): T[] {
  const bo = useBackoffice();
  return useStore(bo.data.store, (s) => (s.data[name] ?? []) as T[]);
}
