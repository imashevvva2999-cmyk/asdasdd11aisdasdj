import type { ActivityEvent, Localized } from './domain.ts';
import { can, type Permission, type PermissionMatrix } from './rbac.ts';

/**
 * Generic review workflow for the back-office prototypes (ARM: track / release moderation, artist verification).
 * Pure functions — no storage, no React — so the rules are unit-tested: who may decide (permission matrix), from
 * which status, and when a reason is mandatory. Every successful decision yields the audit event to record.
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'changes-requested';
export type ReviewDecision = 'approve' | 'reject' | 'request-changes';

export const REVIEW_STATUSES: readonly ReviewStatus[] = ['pending', 'approved', 'rejected', 'changes-requested'];
export const REVIEW_DECISIONS: readonly ReviewDecision[] = ['approve', 'reject', 'request-changes'];

export const DECISION_RESULT: Readonly<Record<ReviewDecision, ReviewStatus>> = {
  approve: 'approved',
  reject: 'rejected',
  'request-changes': 'changes-requested',
};

/** A rejection or change request must say why (min. characters after trimming). */
export const MIN_REASON_LENGTH = 10;

export type TransitionError = 'forbidden' | 'not-pending' | 'reason-required' | 'reason-too-short' | 'not-found';

/** The demo staff member acting under the dev role switcher. */
export type Actor = { staffId: string; roleId: string };

export type DecisionContext = { matrix: PermissionMatrix; actor: Actor; now: string };

export function reasonRequired(decision: ReviewDecision): boolean {
  return decision !== 'approve';
}

/** Validates a reason: missing / too short when required; an optional reason is always fine. */
export function checkReason(reason: string | undefined, required: boolean): TransitionError | null {
  const text = reason?.trim() ?? '';
  if (!required) return null;
  if (text.length === 0) return 'reason-required';
  if (text.length < MIN_REASON_LENGTH) return 'reason-too-short';
  return null;
}

/** Only pending items can be decided; permission first, then status, then reason. */
export function validateReview(status: ReviewStatus, decision: ReviewDecision, reason: string | undefined, permission: Permission, ctx: Pick<DecisionContext, 'matrix' | 'actor'>): TransitionError | null {
  if (!can(ctx.matrix, ctx.actor.roleId, permission)) return 'forbidden';
  if (status !== 'pending') return 'not-pending';
  return checkReason(reason, reasonRequired(decision));
}

export type AuditInput = {
  action: string;
  entity: ActivityEvent['entity'];
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
};

/** The audit event for an action (the repository assigns id and the mock flag). */
export function auditEvent(input: AuditInput, ctx: DecisionContext): Omit<ActivityEvent, 'id' | 'mock'> {
  const reason = input.reason?.trim();
  return {
    at: ctx.now,
    actorId: ctx.actor.staffId,
    actorRoleId: ctx.actor.roleId,
    action: input.action,
    entity: input.entity,
    ...(input.fromStatus !== undefined ? { fromStatus: input.fromStatus } : {}),
    ...(input.toStatus !== undefined ? { toStatus: input.toStatus } : {}),
    ...(reason ? { reason } : {}),
  };
}

export type ReviewOutcome<P> = { ok: true; patch: P; event: Omit<ActivityEvent, 'id' | 'mock'> } | { ok: false; error: TransitionError };

export type ReviewFields = { status: ReviewStatus; decidedAt?: string; decidedBy?: string; reason?: string };

/**
 * Applies a review decision to an item with review fields: the status patch (decision time, deciding staff, reason)
 * and the audit event `${entityType}.${decision}`.
 */
export function decide(
  item: ReviewFields & { id: string },
  decision: ReviewDecision,
  reason: string | undefined,
  entity: { type: string; label: string },
  permission: Permission,
  ctx: DecisionContext,
): ReviewOutcome<Partial<ReviewFields>> {
  const error = validateReview(item.status, decision, reason, permission, ctx);
  if (error) return { ok: false, error };
  const toStatus = DECISION_RESULT[decision];
  const cleanReason = reason?.trim() || undefined;
  return {
    ok: true,
    patch: { status: toStatus, decidedAt: ctx.now, decidedBy: ctx.actor.staffId, reason: cleanReason },
    event: auditEvent({ action: `${entity.type}.${decision}`, entity: { type: entity.type, id: item.id, label: entity.label }, fromStatus: item.status, toStatus, reason: cleanReason }, ctx),
  };
}

/** RU/EN labels for review statuses and decisions (shared by the apps). */
export const REVIEW_STATUS_LABELS: Readonly<Record<ReviewStatus, Localized>> = {
  pending: { ru: 'На проверке', en: 'Pending' },
  approved: { ru: 'Одобрено', en: 'Approved' },
  rejected: { ru: 'Отклонено', en: 'Rejected' },
  'changes-requested': { ru: 'Нужны правки', en: 'Changes requested' },
};

export const REVIEW_DECISION_LABELS: Readonly<Record<ReviewDecision, Localized>> = {
  approve: { ru: 'Одобрить', en: 'Approve' },
  reject: { ru: 'Отклонить', en: 'Reject' },
  'request-changes': { ru: 'Запросить правки', en: 'Request changes' },
};

export const TRANSITION_ERROR_LABELS: Readonly<Record<TransitionError, Localized>> = {
  forbidden: { ru: 'У выбранной роли нет прав на это действие.', en: 'The selected role may not do this.' },
  'not-pending': { ru: 'Решение уже принято — элемент больше не на проверке.', en: 'Already decided — the item is no longer pending.' },
  'reason-required': { ru: 'Укажите причину.', en: 'Enter a reason.' },
  'reason-too-short': { ru: `Причина слишком короткая (минимум ${MIN_REASON_LENGTH} символов).`, en: `The reason is too short (at least ${MIN_REASON_LENGTH} characters).` },
  'not-found': { ru: 'Запись не найдена (возможно, демо-данные были сброшены).', en: 'Record not found (the demo data may have been reset).' },
};
