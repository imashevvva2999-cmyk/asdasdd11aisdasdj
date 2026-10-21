import { createStore, type StoreApi } from 'zustand/vanilla';

import type { Locale } from './domain.ts';
import type { SafeStorage } from './storage.ts';

/**
 * RU/EN interface text for the back-office apps. Russian is the default; the choice is remembered per app (its own
 * storage key, so ARM and CRM never share it with each other or with the public website).
 */

export const DEFAULT_LOCALE: Locale = 'ru';

export type StringTable<K extends string> = Record<Locale, Record<K, string>>;

export type LocaleState = { locale: Locale; setLocale: (locale: Locale) => void };

export function createLocaleStore(storage: SafeStorage, key: string): StoreApi<LocaleState> {
  const saved = storage.getJSON<unknown>(key);
  const initial: Locale = saved === 'en' || saved === 'ru' ? saved : DEFAULT_LOCALE;
  return createStore<LocaleState>((set) => ({
    locale: initial,
    setLocale: (locale) => {
      storage.setJSON(key, locale);
      set({ locale });
    },
  }));
}

/** Text shared by both apps' shell. */
export const SHELL_STRINGS = {
  ru: {
    prototypeBadge: 'Локальный прототип · без авторизации',
    demoData: 'Демо-данные',
    demoDataNotice: 'Все данные вымышленные и хранятся только в этом браузере.',
    storageMemory: 'Хранилище браузера недоступно — изменения сохранятся только до перезагрузки страницы.',
    language: 'Язык',
    role: 'Роль · dev, предварительная',
    roleProvisional: 'роли предварительные, только для разработки',
    resetDemo: 'Сбросить демо-данные',
    resetConfirmTitle: 'Сбросить демо-данные?',
    resetConfirmBody: 'Все изменения в этом приложении будут удалены, исходные демо-данные восстановлены.',
    resetConfirm: 'Сбросить',
    cancel: 'Отмена',
    resetDone: 'Демо-данные восстановлены',
    menu: 'Меню',
    collapse: 'Свернуть меню',
    expand: 'Развернуть меню',
    skipToContent: 'Перейти к содержимому',
    sections: 'Разделы',
    comingSoonTitle: 'Раздел в разработке',
    comingSoonBody: 'Этот раздел появится на этапе',
    noAccessTitle: 'Нет доступа',
    noAccessBody: 'У выбранной роли нет прав на этот раздел. Смените роль в верхней панели.',
    notFoundTitle: 'Страница не найдена',
    toDashboard: 'На главную',
  },
  en: {
    prototypeBadge: 'Local prototype · no authentication',
    demoData: 'Demo data',
    demoDataNotice: 'All data is fictional and stored only in this browser.',
    storageMemory: 'Browser storage is unavailable — changes last only until the page is reloaded.',
    language: 'Language',
    role: 'Role · dev, provisional',
    roleProvisional: 'provisional roles, development only',
    resetDemo: 'Reset demo data',
    resetConfirmTitle: 'Reset demo data?',
    resetConfirmBody: 'All changes in this app will be removed and the original demo data restored.',
    resetConfirm: 'Reset',
    cancel: 'Cancel',
    resetDone: 'Demo data restored',
    menu: 'Menu',
    collapse: 'Collapse menu',
    expand: 'Expand menu',
    skipToContent: 'Skip to content',
    sections: 'Sections',
    comingSoonTitle: 'Section in progress',
    comingSoonBody: 'This section arrives in milestone',
    noAccessTitle: 'No access',
    noAccessBody: 'The selected role has no rights for this section. Switch the role in the top bar.',
    notFoundTitle: 'Page not found',
    toDashboard: 'Go to dashboard',
  },
} as const satisfies StringTable<string>;

export type ShellStringKey = keyof (typeof SHELL_STRINGS)['ru'];

/** Formats numbers and dates for the current locale. */
export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US');
}
