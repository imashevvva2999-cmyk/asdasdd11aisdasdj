// First: configures @mmusic/core storage before the persisted locale store is used.
import '@/platform/storage';

import { useLocaleStore } from '@mmusic/core/state/locale-store';

/**
 * Player / Discover text the shared app strings (core/lib/i18n.ts) do not have: the website's visible shuffle and
 * repeat states and Discover's desktop controls (the app has gestures only). RU + EN, same tone as the app.
 */
const STRINGS = {
  en: {
    repeatOff: 'Repeat: off',
    repeatAll: 'Repeat: all',
    repeatOne: 'Repeat: one track',
    shuffleOn: 'Shuffle: on',
    shuffleOff: 'Shuffle: off',
    previousGenre: 'Previous genre',
    nextGenre: 'Next genre',
    discoverTitle: 'Discover',
    discoverHintTracks: 'tracks',
    discoverHintGenres: 'genres',
    discoverSwipeHint: 'Swipe up/down for tracks, left/right for genres',
  },
  ru: {
    repeatOff: 'Повтор: выключен',
    repeatAll: 'Повтор: все',
    repeatOne: 'Повтор: один трек',
    shuffleOn: 'Перемешивание: вкл.',
    shuffleOff: 'Перемешивание: выкл.',
    previousGenre: 'Предыдущий жанр',
    nextGenre: 'Следующий жанр',
    discoverTitle: 'Открытия',
    discoverHintTracks: 'треки',
    discoverHintGenres: 'жанры',
    discoverSwipeHint: 'Вверх/вниз — треки, влево/вправо — жанры',
  },
} as const;

export type PlayerStringKey = keyof (typeof STRINGS)['en'];

export function usePlayerStrings(): (key: PlayerStringKey) => string {
  const locale = useLocaleStore((s) => s.locale);
  return (key) => STRINGS[locale][key];
}
