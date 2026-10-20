/** Per-screen Stitch copy table: RU = the Stitch export's text verbatim, EN =
 * its translation. Every key must exist in both (scripts/verify-promotion-stitch-strings.mjs). */
export type PromoStringTable<K extends string> = { en: Record<K, string>; ru: Record<K, string> };
