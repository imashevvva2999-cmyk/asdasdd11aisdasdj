import type { PromoStringTable } from '@mmusic/core/promotion/string-table';

import { useLocaleStore } from '@/state/locale-store';

export { S, SR, SS, alpha, sf } from './theme';
export type { StitchWeight } from './theme';
export { SText } from './s-text';
export type { STextProps } from './s-text';
export { StitchHeader } from './stitch-header';
export type { StitchHeaderProps } from './stitch-header';

// The copy-table type lives in @mmusic/core with the tables themselves (W2.4b group 3).
export type { PromoStringTable } from '@mmusic/core/promotion/string-table';

/** Pick the current app locale's half of a per-screen Stitch copy table. */
export function usePromoStrings<K extends string>(table: PromoStringTable<K>): Record<K, string> {
  const locale = useLocaleStore((s) => s.locale);
  return table[locale];
}
