import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

import type { ActivityEvent, Locale } from '@mmusic/backoffice/domain';
import type { Permission } from '@mmusic/backoffice/rbac';
import { useBackoffice, useCan, useLocale, useLocalized, useRole, useT } from '@mmusic/backoffice/react';
import { checkReason, reasonRequired, REVIEW_DECISION_LABELS, REVIEW_STATUS_LABELS, TRANSITION_ERROR_LABELS, type ReviewDecision, type ReviewStatus } from '@mmusic/backoffice/review';
import { ConfirmDialog, PermissionNote, StatusBadge, type StatusTone } from '@mmusic/backoffice/ui';

import type { ActionError } from '@/data/actions';
import type { UserStatus } from '@/domain/types';
import { ARM_STRINGS, fill, type ArmStringKey } from '@/strings';

/** Filter state kept in the URL (?q=&status=…): survives navigation and lets the dashboard link to a filtered queue. */
export function useQueryState() {
  const [params, setParams] = useSearchParams();
  // Several changes before the next render (e.g. clear the search, then pick a genre) must build on each other,
  // not on the params of the last render.
  const pending = useRef<URLSearchParams | null>(null);
  useEffect(() => {
    pending.current = null;
  }, [params]);
  return {
    get: (key: string) => params.get(key) ?? '',
    set: (key: string, value: string) => {
      const next = new URLSearchParams(pending.current ?? params);
      if (value) next.set(key, value);
      else next.delete(key);
      pending.current = next;
      setParams(next, { replace: true });
    },
    clear: () => {
      pending.current = new URLSearchParams();
      setParams(new URLSearchParams(), { replace: true });
    },
  };
}

/** Case-insensitive "contains" for search fields. */
export function matches(text: string, query: string): boolean {
  return text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

/** ARM page helpers: strings, formatting, labels for statuses / actions / people. */
export function useArm() {
  const t = useT(ARM_STRINGS);
  const l = useLocalized();
  const locale = useLocale();
  const bo = useBackoffice();
  return {
    t,
    l,
    locale,
    date: (iso: string | undefined) => (iso ? formatDate(iso, locale) : '—'),
    roleLabel: (roleId: string) => {
      const role = bo.roles.find((r) => r.id === roleId);
      return role ? l(role.label) : roleId;
    },
    staffName: (staffId: string | undefined) => bo.staff.find((s) => s.id === staffId)?.name ?? t('unknownStaff'),
    /** "Отклонение · Трек" for an audit action key like 'track.reject'. */
    actionText: (action: string) => {
      const [kind = '', verb = ''] = action.split('.');
      return [ACTION_KEYS[verb] ? t(ACTION_KEYS[verb]) : action, KIND_KEYS[kind] ? t(KIND_KEYS[kind]) : ''].filter(Boolean).join(' · ');
    },
    errorText: (error: ActionError) =>
      error === 'same-status' ? t('errorSameStatus') : error === 'staff-account' ? t('errorStaffAccount') : l(TRANSITION_ERROR_LABELS[error]),
  };
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function formatDuration(sec: number | undefined): string {
  return sec === undefined ? '—' : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** e-mail with the local part mostly hidden: "be***@example.kg". */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

export const REVIEW_TONE: Record<ReviewStatus, StatusTone> = { pending: 'pending', approved: 'success', rejected: 'danger', 'changes-requested': 'warning' };
const ARTIST_STATUS_KEYS: Record<ReviewStatus, ArmStringKey> = { pending: 'artistPending', approved: 'artistApproved', rejected: 'artistRejected', 'changes-requested': 'artistChanges' };

export function ReviewBadge({ status, artist }: { status: ReviewStatus; artist?: boolean }) {
  const { t, l } = useArm();
  return <StatusBadge tone={REVIEW_TONE[status]} label={artist ? t(ARTIST_STATUS_KEYS[status]) : l(REVIEW_STATUS_LABELS[status])} />;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { t } = useArm();
  return <StatusBadge tone={status === 'active' ? 'success' : 'danger'} label={status === 'active' ? t('statusActive') : t('statusSuspended')} />;
}

/** Status text for an audit event's entity type. */
function StatusOf({ type, status }: { type: string; status: string }) {
  if (type === 'user') return <UserStatusBadge status={status as UserStatus} />;
  return <ReviewBadge status={status as ReviewStatus} artist={type === 'artist'} />;
}

const ACTION_KEYS: Record<string, ArmStringKey> = {
  approve: 'actionApprove',
  reject: 'actionReject',
  'request-changes': 'actionRequestChanges',
  suspend: 'actionSuspend',
  reactivate: 'actionReactivate',
};
const KIND_KEYS: Record<string, ArmStringKey> = { track: 'kindTrack', release: 'kindRelease', artist: 'kindArtist', user: 'kindUser' };

export function actionVerb(action: string): string {
  return action.split('.')[1] ?? action;
}

export function entityPath(entity: ActivityEvent['entity']): string {
  if (entity.type === 'track') return `/moderation/tracks/${entity.id}`;
  if (entity.type === 'release') return `/moderation/releases/${entity.id}`;
  if (entity.type === 'artist') return `/artists/${entity.id}`;
  return `/users/${entity.id}`;
}

/** Audit events as a table (activity log and the history of detail pages), newest first. */
export function EventTable({ events, showEntity = true }: { events: ActivityEvent[]; showEntity?: boolean }) {
  const { t, date, roleLabel, staffName } = useArm();
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  if (sorted.length === 0) return <p className="bo-muted">{t('noHistory')}</p>;
  return (
    <div className="bo-table-wrap">
      <table className="bo-table">
        <thead>
          <tr>
            <th>{t('colTime')}</th>
            <th>{t('colStaff')}</th>
            <th>{t('colAction')}</th>
            {showEntity && <th>{t('colEntity')}</th>}
            <th>{t('colChange')}</th>
            <th>{t('colReason')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => {
            const verbKey = ACTION_KEYS[actionVerb(e.action)];
            const kindKey = KIND_KEYS[e.entity.type];
            return (
              <tr key={e.id}>
                <td className="nowrap muted">{date(e.at)}</td>
                <td>
                  {staffName(e.actorId)}
                  <span className="muted bo-sub">{roleLabel(e.actorRoleId)}</span>
                </td>
                <td className="nowrap">
                  {verbKey ? t(verbKey) : e.action}
                  {kindKey && <span className="muted"> · {t(kindKey)}</span>}
                </td>
                {showEntity && (
                  <td>
                    <Link className="bo-link" to={entityPath(e.entity)}>
                      {e.entity.label}
                    </Link>
                  </td>
                )}
                <td className="nowrap">
                  {e.fromStatus && <StatusOf type={e.entity.type} status={e.fromStatus} />}
                  {e.fromStatus && e.toStatus && <span className="muted"> → </span>}
                  {e.toStatus && <StatusOf type={e.entity.type} status={e.toStatus} />}
                </td>
                <td className="muted" style={{ minWidth: 200 }}>
                  {e.reason ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Approve / request changes / reject for a pending item, each behind a confirmation dialog; rejection and change
 * requests need a reason. Roles without `permission` see the buttons disabled with an explanation.
 */
export function DecisionPanel({
  heading,
  title,
  status,
  permission,
  artist,
  hint,
  preview,
  onDecide,
}: {
  heading: string;
  title: string;
  status: ReviewStatus;
  permission: Permission;
  artist?: boolean;
  hint: string;
  /** Shown above the decision buttons (the track's audio preview). */
  preview?: ReactNode;
  onDecide: (decision: ReviewDecision, reason: string) => Promise<ActionError | null>;
}) {
  const { t, l, errorText } = useArm();
  const allowed = useCan(permission);
  const role = useRole();
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const pending = status === 'pending';

  const open = (d: ReviewDecision) => {
    setDecision(d);
    setReason('');
    setReasonError(undefined);
    setError(undefined);
    setSaved(false);
  };
  const confirm = async () => {
    if (!decision) return;
    const invalid = checkReason(reason, reasonRequired(decision));
    if (invalid) return setReasonError(l(TRANSITION_ERROR_LABELS[invalid]));
    setBusy(true);
    const failed = await onDecide(decision, reason);
    setBusy(false);
    if (failed) return setError(errorText(failed));
    setDecision(null);
    setSaved(true);
  };
  const label = (d: ReviewDecision) => (artist && d === 'approve' ? t('verifyAction') : l(REVIEW_DECISION_LABELS[d]));
  const dialogTitle = decision === 'approve' ? fill(t(artist ? 'confirmVerify' : 'confirmApprove'), { title }) : decision === 'reject' ? fill(t('confirmReject'), { title }) : fill(t('confirmChanges'), { title });

  return (
    <section className="bo-card" aria-label={heading}>
      <h2>{heading}</h2>
      {preview}
      <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
        {pending ? hint : t('decisionDoneHint')}
      </p>
      {pending && (
        <div className="bo-actions">
          <button type="button" className="bo-btn small" disabled={!allowed} onClick={() => open('approve')}>
            {label('approve')}
          </button>
          <button type="button" className="bo-btn small warn" disabled={!allowed} onClick={() => open('request-changes')}>
            {label('request-changes')}
          </button>
          <button type="button" className="bo-btn small danger" disabled={!allowed} onClick={() => open('reject')}>
            {label('reject')}
          </button>
        </div>
      )}
      {pending && !allowed && <p className="bo-field-error">{fill(t('viewOnlyRole'), { role: role ? l(role.label) : '—' })}</p>}
      {saved && (
        <output className="bo-saved">{t('savedNotice')}</output>
      )}
      <PermissionNote />
      <ConfirmDialog
        open={decision !== null}
        title={dialogTitle}
        body={decision === 'approve' ? (artist ? t('confirmVerifyBody') : t('confirmApproveBody')) : t('confirmReasonBody')}
        confirmLabel={decision ? label(decision) : ''}
        danger={decision === 'reject'}
        reason={decision ? { required: reasonRequired(decision), value: reason, onChange: (v) => (setReason(v), setReasonError(undefined)), error: reasonError } : undefined}
        busy={busy}
        error={error}
        onConfirm={() => void confirm()}
        onCancel={() => setDecision(null)}
      />
    </section>
  );
}
