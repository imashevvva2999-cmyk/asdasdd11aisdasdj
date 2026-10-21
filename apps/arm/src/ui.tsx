import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

import type { ActivityEvent, Locale } from '@mmusic/backoffice/domain';
import { useBackoffice, useLocale, useLocalized, useRole, useT } from '@mmusic/backoffice/react';
import { checkReason, reasonRequired, REVIEW_DECISION_LABELS, REVIEW_STATUS_LABELS, TRANSITION_ERROR_LABELS, type ReviewDecision, type ReviewStatus } from '@mmusic/backoffice/review';
import { ConfirmDialog, PermissionNote, StatusBadge, type StatusTone } from '@mmusic/backoffice/ui';

import { useArmCan } from '@/access';
import type { ActionError } from '@/data/actions';
import { PERMISSION_GROUPS, type ArmPermission } from '@/domain/permissions';
import type { PreferenceField } from '@/domain/settings';
import type { ListingStatus, UserStatus } from '@/domain/types';
import { ARM_STRINGS, fill, type ArmStringKey } from '@/strings';

import './arm.css';

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

/**
 * Applies a default filter from the ARM settings (M6) once, when a list opens without any filter in the URL. Links
 * that carry filters (dashboard) and filters chosen or cleared by hand afterwards are left alone.
 */
export function useDefaultFilter(key: string, value: string) {
  const [params, setParams] = useSearchParams();
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    if (value && params.size === 0) setParams(new URLSearchParams({ [key]: value }), { replace: true });
  }, [key, value, params, setParams]);
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
    errorText: (error: ActionError) => (error in ERROR_KEYS ? t(ERROR_KEYS[error as keyof typeof ERROR_KEYS]) : l(TRANSITION_ERROR_LABELS[error as keyof typeof TRANSITION_ERROR_LABELS])),
    /** Entity name of an audit event (roles by their label, settings by name). */
    entityLabel: (e: ActivityEvent) => {
      const role = e.entity.type === 'role' ? bo.roles.find((r) => r.id === e.entity.id) : undefined;
      return role ? l(role.label) : e.entity.type === 'setting' ? t('kindSetting') : e.entity.label;
    },
    /** Name of an ARM right (matrix row label) for audit events of the roles screen. */
    permissionLabel: (key: string) => {
      const item = PERMISSION_GROUPS.flatMap((g) => g.items).find((i) => i.key === key);
      return item ? l(item.label) : key;
    },
  };
}

const ERROR_KEYS = {
  'same-status': 'errorSameStatus',
  'staff-account': 'errorStaffAccount',
  'item-not-ready': 'errorItemNotReady',
  'not-approved': 'errorNotApproved',
  'last-super-admin': 'errorLastSuperAdmin',
  'unknown-role': 'errorUnknownRole',
  locked: 'errorLocked',
  invalid: 'errorInvalidSettings',
} as const satisfies Partial<Record<ActionError, ArmStringKey>>;

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

export function ListingBadge({ status }: { status: ListingStatus }) {
  const { t } = useArm();
  return <StatusBadge tone={status === 'listed' ? 'success' : 'neutral'} label={status === 'listed' ? t('listingListed') : t('listingUnlisted')} />;
}

/** Status text for an audit event's entity type. */
function StatusOf({ type, status }: { type: string; status: string }) {
  const { roleLabel } = useArm();
  if (type === 'staff') return <StatusBadge tone="neutral" label={roleLabel(status)} />;
  if (type === 'user') return <UserStatusBadge status={status as UserStatus} />;
  if (status === 'listed' || status === 'unlisted') return <ListingBadge status={status} />;
  return <ReviewBadge status={status as ReviewStatus} artist={type === 'artist'} />;
}

const ACTION_KEYS: Record<string, ArmStringKey> = {
  approve: 'actionApprove',
  reject: 'actionReject',
  'request-changes': 'actionRequestChanges',
  suspend: 'actionSuspend',
  reactivate: 'actionReactivate',
  unlist: 'actionUnlist',
  relist: 'actionRelist',
  grant: 'actionGrant',
  revoke: 'actionRevoke',
  reset: 'actionReset',
  role: 'actionStaffRole',
  preferences: 'actionPreferences',
};
const KIND_KEYS: Record<string, ArmStringKey> = { track: 'kindTrack', release: 'kindRelease', artist: 'kindArtist', user: 'kindUser', campaign: 'kindCampaign', role: 'kindRole', staff: 'kindStaff', setting: 'kindSetting', settings: 'kindSetting' };
const PREFERENCE_KEYS: Record<PreferenceField, ArmStringKey> = {
  moderationStatus: 'prefModerationStatus',
  artistStatus: 'prefArtistStatus',
  campaignStatus: 'prefCampaignStatus',
  catalogTab: 'prefCatalogTab',
  recentActivity: 'prefRecentActivity',
  nextAfterDecision: 'prefNextAfterDecision',
};

export function actionVerb(action: string): string {
  return action.split('.')[1] ?? action;
}

export function entityPath(entity: ActivityEvent['entity']): string {
  if (entity.type === 'track') return `/moderation/tracks/${entity.id}`;
  if (entity.type === 'release') return `/moderation/releases/${entity.id}`;
  if (entity.type === 'artist') return `/artists/${entity.id}`;
  if (entity.type === 'campaign') return `/campaigns/${entity.id}`;
  if (entity.type === 'role' || entity.type === 'staff') return '/staff';
  if (entity.type === 'setting') return '/settings';
  return `/users/${entity.id}`;
}

/** Audit events as a table (activity log and the history of detail pages), newest first. */
export function EventTable({ events, showEntity = true }: { events: ActivityEvent[]; showEntity?: boolean }) {
  const { t, date, roleLabel, staffName, permissionLabel, entityLabel } = useArm();
  /** Role events keep the right's key and settings events the changed fields: shown by name. */
  const reasonText = (e: ActivityEvent) =>
    !e.reason
      ? '—'
      : e.action === 'role.grant' || e.action === 'role.revoke'
        ? permissionLabel(e.reason)
        : e.action === 'settings.preferences'
          ? e.reason.split(', ').map((k) => (k in PREFERENCE_KEYS ? t(PREFERENCE_KEYS[k as PreferenceField]) : k)).join(', ')
          : e.reason;
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
                      {entityLabel(e)}
                    </Link>
                  </td>
                )}
                <td className="nowrap">
                  {e.fromStatus && <StatusOf type={e.entity.type} status={e.fromStatus} />}
                  {e.fromStatus && e.toStatus && <span className="muted"> → </span>}
                  {e.toStatus && <StatusOf type={e.entity.type} status={e.toStatus} />}
                </td>
                <td className="muted" style={{ minWidth: 200 }}>
                  {reasonText(e)}
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
  permission: ArmPermission;
  artist?: boolean;
  hint: string;
  /** Shown above the decision buttons (the track's audio preview). */
  preview?: ReactNode;
  onDecide: (decision: ReviewDecision, reason: string) => Promise<ActionError | null>;
}) {
  const { t, l, errorText } = useArm();
  const allowed = useArmCan(permission);
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

/** A labelled select of the settings and staff screens (M6); `ariaLabel` names it more precisely for screen readers. */
export function SelectField({ label, ariaLabel, hint, value, onChange, options }: { label: string; ariaLabel?: string; hint?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <div className="bo-field arm-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} aria-label={ariaLabel} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <span id={`${id}-hint`} className="bo-field-hint">
          {hint}
        </span>
      )}
    </div>
  );
}
