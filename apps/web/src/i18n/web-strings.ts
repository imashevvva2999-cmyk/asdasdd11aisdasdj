import type { AppLocale } from '@mmusic/core/state/locale-store';

/**
 * Website-only interface text that has no counterpart in the Expo app's shared strings (@mmusic/core
 * lib/i18n): page landmarks of the browser shell. Everything else comes from the shared APP_STRINGS.
 */
export const WEB_STRINGS = {
  ru: { skipToContent: 'Перейти к содержимому', sectionsNav: 'Разделы' },
  en: { skipToContent: 'Skip to content', sectionsNav: 'Sections' },
} as const satisfies Record<AppLocale, Record<string, string>>;

export type WebStringKey = keyof (typeof WEB_STRINGS)['ru'];
