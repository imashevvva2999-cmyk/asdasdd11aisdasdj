import { useLocaleStore } from '@/state/locale-store';

export { S, SR, SS, alpha, sf } from './theme';
export type { StitchWeight } from './theme';
export { SText } from './s-text';
export type { STextProps } from './s-text';
export { StitchHeader } from './stitch-header';
export type { StitchHeaderProps } from './stitch-header';

/** Per-screen Stitch copy table: RU = the Stitch export's text verbatim, EN =
 * its translation. Every key must exist in both (scripts/verify-promotion-stitch-strings.mjs). */
export type PromoStringTable<K extends string> = { en: Record<K, string>; ru: Record<K, string> };

/** Pick the current app locale's half of a per-screen Stitch copy table. */
export function usePromoStrings<K extends string>(table: PromoStringTable<K>): Record<K, string> {
  const locale = useLocaleStore((s) => s.locale);
  return table[locale];
}
