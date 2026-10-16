import type { ArtistId, SupportHistoryEntry } from '@/mocks';

/**
 * Real sum of this artist's completed donations from Support History
 * (S-22) — not a mock stat. Used by the Artist Dashboard's Support card
 * instead of the previous hardcoded `formatKgsAmount(0)`.
 */
export function getArtistSupportTotalKgs(history: SupportHistoryEntry[], artistId: ArtistId): number {
  return history.filter((entry) => entry.artistId === artistId && entry.status === 'completed').reduce((sum, entry) => sum + entry.amount, 0);
}
