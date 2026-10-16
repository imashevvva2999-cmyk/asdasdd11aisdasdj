import type { PromoStringTable } from '@/components/promotion-stitch';

type K =
  | 'required'
  | 'optional'
  | 'genreFromTrack'
  | 'descriptionTitle'
  | 'descriptionHint'
  | 'descriptionPlaceholder'
  | 'regionsTitle'
  | 'regionsHint'
  | 'errNoGenres'
  | 'errNoRegions'
  | 'fixErrors'
  | 'back';

/** Campaign Setup form-structure copy (field status, hints, inline validation)
 * that the Stitch export has no text for. */
export const SetupFormPromoStrings = {
  en: {
    required: 'Required',
    optional: 'Optional',
    genreFromTrack: 'Track genre',
    descriptionTitle: 'Promotion description',
    descriptionHint: 'A short line about the release. It helps moderators and may appear next to the track in recommendations.',
    descriptionPlaceholder: 'E.g. a new summer single for evening drives',
    regionsTitle: 'Regions',
    regionsHint: 'Pick one or more regions of Kyrgyzstan.',
    errNoGenres: 'Choose at least one genre',
    errNoRegions: 'Choose at least one region',
    fixErrors: 'Fill in the required fields above',
    back: 'Back',
  },
  ru: {
    required: 'Обязательно',
    optional: 'Необязательно',
    genreFromTrack: 'Жанр трека',
    descriptionTitle: 'Описание продвижения',
    descriptionHint: 'Пара слов о релизе. Помогает модерации и может показываться рядом с треком в рекомендациях.',
    descriptionPlaceholder: 'Например: новый летний сингл для вечерних поездок',
    regionsTitle: 'Регионы',
    regionsHint: 'Выберите один или несколько регионов Кыргызстана.',
    errNoGenres: 'Выберите хотя бы один жанр',
    errNoRegions: 'Выберите хотя бы один регион',
    fixErrors: 'Заполните обязательные поля выше',
    back: 'Назад',
  },
} satisfies PromoStringTable<K>;

/** Regions of Kyrgyzstan for the "custom" location option. */
export const KG_REGIONS: { id: string; label: { en: string; ru: string } }[] = [
  { id: 'bishkek', label: { en: 'Bishkek', ru: 'Бишкек' } },
  { id: 'osh', label: { en: 'Osh', ru: 'Ош' } },
  { id: 'chui', label: { en: 'Chui', ru: 'Чуйская обл.' } },
  { id: 'issyk-kul', label: { en: 'Issyk-Kul', ru: 'Иссык-Куль' } },
  { id: 'jalal-abad', label: { en: 'Jalal-Abad', ru: 'Джалал-Абад' } },
  { id: 'naryn', label: { en: 'Naryn', ru: 'Нарын' } },
  { id: 'talas', label: { en: 'Talas', ru: 'Талас' } },
  { id: 'batken', label: { en: 'Batken', ru: 'Баткен' } },
];

/** Upload-form genre → Stitch target-genre id, to pre-check the track's own genre. */
export const UPLOAD_GENRE_TO_TARGET: Record<string, string> = {
  Electronic: 'electronic-dance',
  Synthwave: 'electronic-dance',
  Ambient: 'chill-lofi',
  'Lo-Fi': 'chill-lofi',
  'Neo-Classical': 'chill-lofi',
  Indie: 'rock-indie',
  Rock: 'rock-indie',
  'Dream Pop': 'pop',
  Pop: 'pop',
  'Hip-Hop': 'hip-hop-rnb',
};
