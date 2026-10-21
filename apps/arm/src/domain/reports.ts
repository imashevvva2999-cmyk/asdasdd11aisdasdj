import type { ActivityEvent } from '@mmusic/backoffice/domain';
import type { ReviewStatus } from '@mmusic/backoffice/review';

import type { Campaign, DemoTransaction, PromoToolId, Submission, SubmissionKind, TransactionStatus } from './types.ts';
import { countByStatus } from './workflow.ts';

/**
 * Administrative reports (M3) as pure aggregations of the prototype's own demo data — moderation throughput,
 * campaign reviews, demo donations and staff activity. Nothing here estimates platform revenue, streams or audiences.
 */

export type ModerationRow = { kind: SubmissionKind; total: number; counts: Record<ReviewStatus, number>; medianDecisionHours: number | null };

/** Median of a list (null when empty). */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const hoursBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 3_600_000;

export function moderationReport(subs: Submission[]): ModerationRow[] {
  return (['track', 'release'] as const).map((kind) => {
    const items = subs.filter((s) => s.kind === kind);
    const decided = items.filter((s) => s.decidedAt);
    return { kind, total: items.length, counts: countByStatus(items), medianDecisionHours: median(decided.map((s) => hoursBetween(s.submittedAt, s.decidedAt!))) };
  });
}

export type CampaignRow = { toolId: PromoToolId; total: number; counts: Record<ReviewStatus, number>; requestedBudgetKgs: number };

/** Campaign requests per promotion tool: review statuses and the sum of requested (fictional) budgets. */
export function campaignReport(campaigns: Campaign[]): CampaignRow[] {
  return (['recommendation-boost', 'editorial-pitch', 'home-banner'] as const).map((toolId) => {
    const items = campaigns.filter((c) => c.toolId === toolId);
    return { toolId, total: items.length, counts: countByStatus(items), requestedBudgetKgs: items.reduce((sum, c) => sum + (c.requestedBudgetKgs ?? 0), 0) };
  });
}

export const TRANSACTION_STATUSES: readonly TransactionStatus[] = ['completed', 'pending', 'failed'];

export type PaymentStatusRow = { status: TransactionStatus; count: number; amountKgs: number };
export type PaymentArtistRow = { artistId: string; completedCount: number; completedKgs: number; supporters: number };

export function paymentsByStatus(txs: DemoTransaction[]): PaymentStatusRow[] {
  return TRANSACTION_STATUSES.map((status) => {
    const items = txs.filter((t) => t.status === status);
    return { status, count: items.length, amountKgs: items.reduce((sum, t) => sum + t.amountKgs, 0) };
  });
}

/** Completed demo donations per recipient (fictional demo artists only), largest first. */
export function paymentsByArtist(txs: DemoTransaction[]): PaymentArtistRow[] {
  const rows = new Map<string, PaymentArtistRow & { payers: Set<string> }>();
  for (const t of txs.filter((x) => x.status === 'completed')) {
    const row = rows.get(t.recipientArtistId) ?? { artistId: t.recipientArtistId, completedCount: 0, completedKgs: 0, supporters: 0, payers: new Set<string>() };
    row.completedCount += 1;
    row.completedKgs += t.amountKgs;
    row.payers.add(t.payerUserId);
    rows.set(t.recipientArtistId, row);
  }
  return [...rows.values()].map(({ payers, ...r }) => ({ ...r, supporters: payers.size })).sort((a, b) => b.completedKgs - a.completedKgs || a.artistId.localeCompare(b.artistId));
}

export type ActivityRow = { roleId: string; total: number; byVerb: Record<string, number> };

/** Audit events per staff role and action verb (approve, reject, suspend, unlist…). */
export function activityReport(events: ActivityEvent[]): ActivityRow[] {
  const rows = new Map<string, ActivityRow>();
  for (const e of events) {
    const row = rows.get(e.actorRoleId) ?? { roleId: e.actorRoleId, total: 0, byVerb: {} };
    const verb = e.action.split('.')[1] ?? e.action;
    row.total += 1;
    row.byVerb[verb] = (row.byVerb[verb] ?? 0) + 1;
    rows.set(e.actorRoleId, row);
  }
  return [...rows.values()].sort((a, b) => b.total - a.total || a.roleId.localeCompare(b.roleId));
}

/** CSV with a BOM (Excel opens UTF-8 Cyrillic correctly); fields with separators, quotes or newlines are quoted. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${[header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}
