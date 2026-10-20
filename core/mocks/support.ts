import type { SupportHistoryEntry } from './types';

/**
 * Seed Support History (S-22). All entries are `status: 'completed'` mock
 * data — no real MBANK transaction ever produced them. `useSupportStore`
 * (src/state/support-store.ts) appends new entries to this same shape when a
 * local donation flow completes, so Support History and this seed share one
 * model instead of two.
 */
export const initialSupportHistory: SupportHistoryEntry[] = [
  { id: 'sup-seed-1', artistId: 'solaris-echo', amount: 100, currency: 'KGS', status: 'completed', createdAt: '2026-10-06T19:20:00+06:00' },
  { id: 'sup-seed-2', artistId: 'kaelen', amount: 50, currency: 'KGS', status: 'completed', createdAt: '2026-09-30T12:05:00+06:00' },
  { id: 'sup-seed-3', artistId: 'maya-lin', amount: 500, currency: 'KGS', status: 'completed', createdAt: '2026-09-18T08:45:00+06:00' },
];

/** Canonical quick-amount set, сом/KGS (docs/open-questions.md OQ-08 — the Stitch
 * design's $3/$10/$25 variant is not used). */
export const quickDonationAmountsKgs = [10, 50, 100, 500];
