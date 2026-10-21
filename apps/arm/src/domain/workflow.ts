import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { can } from '@mmusic/backoffice/rbac';
import { auditEvent, checkReason, decide, type DecisionContext, type ReviewDecision, type ReviewOutcome, type ReviewStatus, type TransitionError } from '@mmusic/backoffice/review';

import type { DemoArtist, DemoUser, Submission, UserStatus } from './types.ts';

/**
 * ARM actions as pure functions (unit-tested): each validates the permission matrix, the current status and the
 * reason, and returns the record patch plus the audit event — or the reason it was refused. Screens apply the result
 * through the mock repositories; nothing here touches storage.
 */

/** Track / release moderation (permission arm.moderation.decide). */
export function decideSubmission(sub: Submission, decision: ReviewDecision, reason: string | undefined, ctx: DecisionContext) {
  return decide(sub, decision, reason, { type: sub.kind, label: sub.title }, 'arm.moderation.decide', ctx);
}

/** Artist verification review of a fictional applicant (permission arm.artists.edit). */
export function reviewArtist(artist: DemoArtist, decision: ReviewDecision, reason: string | undefined, ctx: DecisionContext) {
  return decide(artist, decision, reason, { type: 'artist', label: artist.name }, 'arm.artists.edit', ctx);
}

export type UserStatusError = TransitionError | 'same-status' | 'staff-account';

/**
 * Suspends or reactivates a demo account (permission arm.users.edit). Suspension needs a reason; reactivation may
 * have one. Staff accounts are managed under "Сотрудники и роли" (M6), not here.
 */
export function changeUserStatus(
  user: DemoUser,
  to: UserStatus,
  reason: string | undefined,
  ctx: DecisionContext,
): { ok: true; patch: Pick<DemoUser, 'status' | 'statusReason' | 'statusChangedAt'>; event: Omit<ActivityEvent, 'id' | 'mock'> } | { ok: false; error: UserStatusError } {
  if (!can(ctx.matrix, ctx.actor.roleId, 'arm.users.edit')) return { ok: false, error: 'forbidden' };
  if (user.role === 'staff') return { ok: false, error: 'staff-account' };
  if (user.status === to) return { ok: false, error: 'same-status' };
  const reasonError = checkReason(reason, to === 'suspended');
  if (reasonError) return { ok: false, error: reasonError };
  const clean = reason?.trim() || undefined;
  return {
    ok: true,
    patch: { status: to, statusReason: clean, statusChangedAt: ctx.now },
    event: auditEvent({ action: to === 'suspended' ? 'user.suspend' : 'user.reactivate', entity: { type: 'user', id: user.id, label: user.name }, fromStatus: user.status, toStatus: to, reason: clean }, ctx),
  };
}

export type QueueCounts = Record<ReviewStatus, number>;

export function countByStatus(items: { status: ReviewStatus }[]): QueueCounts {
  const counts: QueueCounts = { pending: 0, approved: 0, rejected: 0, 'changes-requested': 0 };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

/** Pending first, then newest submissions first. */
export function sortQueue<T extends { status: ReviewStatus; submittedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.submittedAt.localeCompare(a.submittedAt));
}

export type { ReviewOutcome };
