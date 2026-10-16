/** Artist Profile header meta line (S-08): joins only the parts that exist, so
 * an artist without a listener count reads "Kyrgyzstan", not "• Kyrgyzstan". */
export function formatArtistMeta(listenersText: string | undefined, location: string | undefined): string {
  return [listenersText, location].filter(Boolean).join(' • ');
}
