import type { LocalizedText } from '../../lib/dashboard-i18n';

export type StitchGenre = {
  /** Existing catalog genre id stored in campaign-store.targetGenreIds. */
  id: string;
  /** Row title on Campaign Setup (Stitch screen 5). */
  label: LocalizedText;
  /** Short chip on Campaign Preview & Payment (Stitch screen 6). */
  chip: LocalizedText;
  hint: LocalizedText;
  /** Trailing reach delta; `bolt` renders the Stitch lightning icon instead. */
  delta: string | 'bolt';
};

/** The 6 "Жанры и предпочтения" rows from the Stitch export, mapped onto the
 * app's existing genre ids (src/mocks/genres.ts). */
export const STITCH_GENRES: StitchGenre[] = [
  {
    id: 'electronic-dance',
    label: { en: 'Electronic & Synthwave', ru: 'Электроника & Синтвейв' },
    chip: { en: 'Electronic', ru: 'Электроника' },
    hint: { en: 'Recommended for your track', ru: 'Рекомендовано для вашего трека' },
    delta: 'bolt',
  },
  {
    id: 'rock-indie',
    label: { en: 'Indie & Alternative', ru: 'Инди & Альтернатива' },
    chip: { en: 'Indie pop', ru: 'Инди-поп' },
    hint: { en: 'High audience engagement', ru: 'Высокая вовлеченность аудитории' },
    delta: '+4.2k',
  },
  {
    id: 'chill-lofi',
    label: { en: 'Chill & Lo-Fi', ru: 'Chill & Lo-Fi' },
    chip: { en: 'Synthwave', ru: 'Синти-вейв' },
    hint: { en: 'Perfect for evening playlists', ru: 'Идеально для вечерних плейлистов' },
    delta: '+6.8k',
  },
  {
    id: 'pop',
    label: { en: 'Pop', ru: 'Поп-музыка' },
    chip: { en: 'Pop', ru: 'Поп' },
    hint: { en: 'Broad radio-format reach', ru: 'Широкий охват радио-формата' },
    delta: '+15k',
  },
  {
    id: 'hip-hop-rnb',
    label: { en: 'Hip-Hop & Rap', ru: 'Хип-хоп & Рэп' },
    chip: { en: 'Hip-Hop', ru: 'Хип-хоп' },
    hint: { en: 'Trending on local charts', ru: 'Тренды локальных чартов' },
    delta: '+9.1k',
  },
  {
    id: 'kyrgyz-music',
    label: { en: 'Traditional & Folk', ru: 'Традиционная & Фольклор' },
    chip: { en: 'Folk', ru: 'Фольклор' },
    hint: { en: 'Ethno motifs and neo-instruments', ru: 'Этно-мотивы и нео-инструменты' },
    delta: '+2.5k',
  },
];

/** Stitch screen 5 pre-checks the first three rows. */
export const STITCH_DEFAULT_GENRE_IDS = ['electronic-dance', 'rock-indie', 'chill-lofi'];
