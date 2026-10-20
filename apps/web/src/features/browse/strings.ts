import { useAppStrings } from '@/i18n/locale';

/** Website-only browse text with no key in core's APP_STRINGS (RU default, EN). */
const STRINGS = {
  ru: {
    removeFromPlaylist: 'Убрать из плейлиста',
    photoInvalid: 'Выберите изображение JPG, PNG или WebP до 10 МБ',
    photoUpdated: 'Фото профиля обновлено',
  },
  en: {
    removeFromPlaylist: 'Remove from playlist',
    photoInvalid: 'Choose a JPG, PNG or WebP image up to 10 MB',
    photoUpdated: 'Profile photo updated',
  },
} as const;

export type BrowseStringKey = keyof (typeof STRINGS)['ru'];

export function useBrowseStrings(): (key: BrowseStringKey) => string {
  const { locale } = useAppStrings();
  return (key) => STRINGS[locale][key];
}
