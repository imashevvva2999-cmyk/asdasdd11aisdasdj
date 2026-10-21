import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

import type { ActivityEvent, Locale } from '@mmusic/backoffice/domain';
import { formatNumber } from '@mmusic/backoffice/i18n';
import { useBackoffice, useCollection, useLocale, useLocalized, useRole, useT } from '@mmusic/backoffice/react';
import { StatusBadge, type StatusTone } from '@mmusic/backoffice/ui';

import { usePipeline } from '@/access';
import type { ActionResult } from '@/data/actions';
import { PERMISSION_GROUPS } from '@/domain/permissions';
import type { FieldError } from '@/domain/rules';
import type { ContactStatus, CrmArtist, CrmContact, CrmOrgKind, CrmOrganization, DealStage, Interaction, RelationshipStatus, TaskPriority, TaskStatus } from '@/domain/types';
import { COLLABORATION_LABELS, CRM_STRINGS, fill, INTERACTION_KIND_KEYS, ORGANIZATION_KIND_LABELS, PRIORITY_KEYS, RELATIONSHIP_LABELS, TASK_STATUS_KEYS, type CrmStringKey } from '@/strings';

import './crm.css';

/** Filter state kept in the URL (?q=&status=…); several changes before the next render build on each other. */
export function useQueryState() {
  const [params, setParams] = useSearchParams();
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

/** The current time, captured once per page mount (overdue follow-ups, "last 30 days"). */
export function useNow(): string {
  const [now] = useState(() => new Date().toISOString());
  return now;
}

export function matches(text: string, query: string): boolean {
  return text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

const FIELD_ERROR_KEYS: Record<FieldError, CrmStringKey> = {
  required: 'errRequired',
  'too-long': 'errTooLong',
  'email-invalid': 'errEmailInvalid',
  'email-not-demo': 'errEmailNotDemo',
  'phone-not-demo': 'errPhoneNotDemo',
  'unknown-organization': 'errUnknownOrganization',
  'unknown-contact': 'errUnknownContact',
  'date-invalid': 'errDateInvalid',
  'follow-up-before': 'errFollowUpBefore',
  'target-required': 'errTargetRequired',
  'too-short': 'errTooShort',
  'unknown-deal': 'errUnknownDeal',
  'unknown-staff': 'errUnknownStaff',
  'contact-not-in-org': 'errContactNotInOrg',
  'deal-not-in-org': 'errDealNotInOrg',
  'value-invalid': 'errValueInvalid',
  'stage-invalid': 'errStageInvalid',
  duplicate: 'errDuplicate',
  'tag-invalid': 'errTagInvalid',
  'unknown-artist': 'errUnknownArtist',
  'counterparty-required': 'errCounterpartyRequired',
  'has-members': 'errHasMembers',
  'image-invalid': 'errImageInvalid',
  'same-participant': 'errSameParticipant',
};

const RESULT_ERROR_KEYS: Record<string, CrmStringKey> = {
  forbidden: 'errForbidden',
  'not-found': 'errNotFound',
  'same-status': 'errSameStatus',
  'invalid-transition': 'errInvalidTransition',
  'in-use': 'errInUse',
  'last-open-stage': 'errLastOpenStage',
  'system-stage': 'errSystemStage',
  locked: 'errLocked',
  'unknown-role': 'errUnknownRole',
  'last-lead': 'errLastLead',
  'not-group': 'errNotGroup',
  invalid: 'errInvalid',
};

const AUDIT_KEYS: Record<string, CrmStringKey> = {
  'contact.create': 'auditContactCreate',
  'contact.update': 'auditContactUpdate',
  'contact.status': 'auditContactStatus',
  'contact.link': 'auditContactLink',
  'contact.unlink': 'auditContactUnlink',
  'organization.create': 'auditOrgCreate',
  'organization.update': 'auditOrgUpdate',
  'organization.relationship': 'auditOrgRelationship',
  'interaction.follow-up-done': 'auditFollowUpDone',
  'deal.create': 'auditDealCreate',
  'deal.update': 'auditDealUpdate',
  'deal.assign': 'auditDealAssign',
  'deal.stage': 'auditDealStage',
  'deal.won': 'auditDealWon',
  'deal.lost': 'auditDealLost',
  'deal.reopen': 'auditDealReopen',
  'task.create': 'auditTaskCreate',
  'task.update': 'auditTaskUpdate',
  'task.assign': 'auditTaskAssign',
  'task.start': 'auditTaskStart',
  'task.pause': 'auditTaskPause',
  'task.complete': 'auditTaskComplete',
  'task.cancel': 'auditTaskCancel',
  'task.reopen': 'auditTaskReopen',
  'stage.create': 'auditStageCreate',
  'stage.rename': 'auditStageRename',
  'stage.reorder': 'auditStageReorder',
  'stage.disable': 'auditStageDisable',
  'stage.enable': 'auditStageEnable',
  'stage.delete': 'auditStageDelete',
  'tag.create': 'auditTagCreate',
  'tag.rename': 'auditTagRename',
  'tag.delete': 'auditTagDelete',
  'settings.preferences': 'auditPreferences',
  'role.grant': 'auditRoleGrant',
  'role.revoke': 'auditRoleRevoke',
  'role.reset': 'auditRoleReset',
  'staff.role': 'auditStaffRole',
  'artist.create': 'auditArtistCreate',
  'artist.update': 'auditArtistUpdate',
  'artist.collaboration': 'auditArtistCollaboration',
  'organization.member-add': 'auditMemberAdd',
  'organization.member-role': 'auditMemberRole',
  'organization.member-remove': 'auditMemberRemove',
};

/** CRM page helpers: strings, dates, people, error texts. */
export function useCrm() {
  const t = useT(CRM_STRINGS);
  const l = useLocalized();
  const locale = useLocale();
  const bo = useBackoffice();
  return {
    t,
    l,
    locale,
    date: (iso: string | undefined) => (iso ? formatDate(iso, locale, true) : '—'),
    day: (iso: string | undefined) => (iso ? formatDate(iso, locale, false) : '—'),
    staffName: (id: string) => bo.staff.find((s) => s.id === id)?.name ?? id,
    roleLabel: (roleId: string) => {
      const role = bo.roles.find((r) => r.id === roleId);
      return role ? l(role.label) : roleId;
    },
    fieldError: (e: FieldError | undefined) => (e ? t(FIELD_ERROR_KEYS[e]) : undefined),
    resultError: (r: ActionResult) => (r.ok ? undefined : t(RESULT_ERROR_KEYS[r.error] ?? 'errInvalid')),
    kgs: (n: number) => fill(t('kgs'), { n: formatNumber(n, locale) }),
    auditText: (action: string) => (AUDIT_KEYS[action] ? t(AUDIT_KEYS[action]) : action.startsWith('interaction.') ? t('auditInteraction') : action),
  };
}

export function formatDate(iso: string, locale: Locale, withTime: boolean): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(iso));
}

/** ISO → value of an <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "The role … can only view this section" — the (prototype) permission state shown instead of hidden actions. */
export function ViewOnly() {
  const { t, l } = useCrm();
  const role = useRole();
  return (
    <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
      {fill(t('viewOnlyRole'), { role: role ? l(role.label) : '—' })}
    </p>
  );
}

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  const { t } = useCrm();
  return <StatusBadge tone={status === 'active' ? 'success' : 'neutral'} label={status === 'active' ? t('statusActive') : t('statusInactive')} />;
}

export const RELATIONSHIP_TONE: Record<RelationshipStatus, StatusTone> = { prospect: 'pending', negotiating: 'warning', active: 'success', paused: 'neutral' };

export function RelationshipBadge({ status }: { status: RelationshipStatus }) {
  const { l } = useCrm();
  return <StatusBadge tone={RELATIONSHIP_TONE[status]} label={l(RELATIONSHIP_LABELS[status])} />;
}

/** Collaboration status of a solo artist (same steps and colours as partners, artist wording). */
export function CollaborationBadge({ status }: { status: RelationshipStatus }) {
  const { l } = useCrm();
  return <StatusBadge tone={RELATIONSHIP_TONE[status]} label={l(COLLABORATION_LABELS[status])} />;
}

const STAGE_TONES: Record<string, StatusTone> = { lead: 'neutral', qualified: 'pending', proposal: 'pending', negotiation: 'warning', won: 'success', lost: 'danger' };
/** Badge / bar colour of a stage id (custom stages: pending). */
export const stageTone = (stage: DealStage): StatusTone => STAGE_TONES[stage] ?? 'pending';

export function DealStageBadge({ stage }: { stage: DealStage }) {
  const pipeline = usePipeline();
  return <StatusBadge tone={stageTone(stage)} label={pipeline.label(stage)} />;
}

export const TASK_TONE: Record<TaskStatus, StatusTone> = { pending: 'pending', 'in-progress': 'warning', completed: 'success', cancelled: 'neutral' };

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useCrm();
  return <StatusBadge tone={TASK_TONE[status]} label={t(TASK_STATUS_KEYS[status])} />;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { t } = useCrm();
  return <StatusBadge tone={priority === 'high' ? 'danger' : 'neutral'} label={t(PRIORITY_KEYS[priority])} />;
}

// ---------------------------------------------------------------- artists, groups and counterparties (unified CRM)

export type Counterparty = { name: string; path: string; artist: boolean };

/** The counterparty of a deal / task / interaction: a solo artist or a group / organization (with its link). */
export function useCounterparty(): (r: { organizationId?: string; artistId?: string }) => Counterparty | undefined {
  const organizations = useCollection<CrmOrganization>('organizations');
  const artists = useCollection<CrmArtist>('artists');
  return (r) => {
    const a = r.artistId ? artists.find((x) => x.id === r.artistId) : undefined;
    if (a) return { name: a.stageName, path: `/artists/${a.id}`, artist: true };
    const o = r.organizationId ? organizations.find((x) => x.id === r.organizationId) : undefined;
    return o ? { name: o.name, path: `/organizations/${o.id}`, artist: false } : undefined;
  };
}

/** Profile image of an artist; without one, generated initials (decorative — the name is always shown next to it). */
export function ArtistAvatar({ artist, size = 40 }: { artist: Pick<CrmArtist, 'id' | 'stageName' | 'avatar'>; size?: number }) {
  if (artist.avatar) return <img className="crm-avatar" src={artist.avatar} alt="" width={size} height={size} />;
  const initials = artist.stageName.replace(/\(.*?\)/g, '').trim().split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toLocaleUpperCase()).join('');
  const hue = Array.from({ length: artist.id.length }, (_, i) => artist.id.charCodeAt(i)).reduce((h, c) => (h * 31 + c) % 360, 7);
  return (
    <span className="crm-avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: `hsl(${hue} 45% 28%)` }}>
      {initials}
    </span>
  );
}

/** Entity-type pill: music groups and solo artists stand out from labels, agencies and companies. */
export function KindBadge({ kind }: { kind: CrmOrgKind | 'solo' }) {
  const { t, l } = useCrm();
  return <span className={`crm-kind ${kind}`}>{kind === 'solo' ? t('entitySolo') : l(ORGANIZATION_KIND_LABELS[kind])}</span>;
}

// ---------------------------------------------------------------- form fields

type FieldProps = { label: string; error?: string; hint?: string; required?: boolean };

function Field({ label, error, hint, required, children }: FieldProps & { children: (id: string, describedBy: string | undefined) => ReactNode }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="bo-field crm-field">
      <label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </label>
      {children(id, hint || error ? hintId : undefined)}
      {error ? (
        <span id={hintId} className="bo-field-error" role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="bo-field-hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

export function TextField({ value, onChange, type = 'text', placeholder, ...field }: FieldProps & { value: string; onChange: (v: string) => void; type?: 'text' | 'email' | 'tel' | 'datetime-local' | 'date'; placeholder?: string }) {
  return <Field {...field}>{(id, d) => <input id={id} type={type} value={value} placeholder={placeholder} aria-invalid={!!field.error} aria-describedby={d} onChange={(e) => onChange(e.target.value)} />}</Field>;
}

export function TextAreaField({ value, onChange, ...field }: FieldProps & { value: string; onChange: (v: string) => void }) {
  return <Field {...field}>{(id, d) => <textarea id={id} rows={4} value={value} aria-invalid={!!field.error} aria-describedby={d} onChange={(e) => onChange(e.target.value)} />}</Field>;
}

export function SelectField({ value, onChange, options, ...field }: FieldProps & { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Field {...field}>
      {(id, d) => (
        <select id={id} value={value} aria-invalid={!!field.error} aria-describedby={d} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

// ---------------------------------------------------------------- history

/** The CRM change log of one record, newest first. */
export function AuditTable({ events }: { events: ActivityEvent[] }) {
  const { t, l, date, staffName, roleLabel, auditText } = useCrm();
  const pipeline = usePipeline();
  const bo = useBackoffice();
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  if (sorted.length === 0) return <p className="bo-muted">{t('noChanges')}</p>;
  const roleName = (id: string) => bo.roles.find((r) => r.id === id);
  const permissionName = (key: string) => PERMISSION_GROUPS.flatMap((g) => g.items).find((i) => i.key === key);
  const detailReason = (e: ActivityEvent) => (e.reason && (e.action === 'role.grant' || e.action === 'role.revoke') ? `${l(roleName(e.entity.id)?.label ?? { ru: e.entity.id, en: e.entity.id })}: ${permissionName(e.reason) ? l(permissionName(e.reason)!.label) : e.reason}` : e.action === 'role.reset' ? l(roleName(e.entity.id)?.label ?? { ru: e.entity.id, en: e.entity.id }) : e.reason ?? '');
  // Artist events use the artist wording of the collaboration statuses; organizations keep the partner wording.
  const statusText = (s: string, e?: ActivityEvent) =>
    e?.entity.type === 'artist' && s in COLLABORATION_LABELS
      ? l(COLLABORATION_LABELS[s as RelationshipStatus])
      : roleName(s)
      ? l(roleName(s)!.label)
      : s in RELATIONSHIP_LABELS
      ? l(RELATIONSHIP_LABELS[s as RelationshipStatus])
      : pipeline.config.some((st) => st.id === s)
        ? pipeline.label(s)
        : s in TASK_STATUS_KEYS
          ? t(TASK_STATUS_KEYS[s as TaskStatus])
          : s === 'active'
            ? t('statusActive')
            : s === 'inactive'
              ? t('statusInactive')
              : s;
  return (
    <div className="bo-table-wrap">
      <table className="bo-table">
        <thead>
          <tr>
            <th>{t('colTime')}</th>
            <th>{t('colStaff')}</th>
            <th>{t('colAction')}</th>
            <th>{t('colDetails')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => (
            <tr key={e.id}>
              <td className="nowrap muted">{date(e.at)}</td>
              <td>
                {staffName(e.actorId)}
                <span className="muted bo-sub">{roleLabel(e.actorRoleId)}</span>
              </td>
              <td>{auditText(e.action)}</td>
              <td className="muted">{[e.entity.type === 'staff' || e.entity.type === 'stage' || e.entity.type === 'tag' ? e.entity.label : '', e.fromStatus && e.toStatus ? `${statusText(e.fromStatus, e)} → ${statusText(e.toStatus, e)}` : e.toStatus ? statusText(e.toStatus, e) : '', detailReason(e)].filter(Boolean).join(' · ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Interactions as a chronological timeline (newest first), with contact / organization / artist links and follow-ups. */
export function Timeline({ items, contacts, organizations, now, canEdit, onDone, showTargets = true }: { items: Interaction[]; contacts: CrmContact[]; organizations: CrmOrganization[]; now: string; canEdit: boolean; onDone: (id: string) => void; showTargets?: boolean }) {
  const { t, date, staffName } = useCrm();
  const artists = useCollection<CrmArtist>('artists');
  if (items.length === 0) return <p className="bo-muted">{t('noInteractions')}</p>;
  return (
    <ol className="crm-timeline">
      {items.map((i) => {
        const contact = contacts.find((c) => c.id === i.contactId);
        const org = organizations.find((o) => o.id === i.organizationId);
        const artist = artists.find((a) => a.id === i.artistId);
        const overdue = !!i.followUpAt && !i.followUpDone && i.followUpAt < now;
        return (
          <li key={i.id} className={`crm-event ${i.kind}`} data-interaction={i.id}>
            <span className="crm-dot" aria-hidden="true" />
            <div className="crm-event-body">
              <div className="crm-event-head">
                <StatusBadge tone="neutral" label={t(INTERACTION_KIND_KEYS[i.kind])} />
                <span className="bo-muted">{date(i.at)}</span>
                {showTargets && contact && (
                  <Link className="bo-link" to={`/contacts/${contact.id}`}>
                    {contact.name}
                  </Link>
                )}
                {showTargets && org && (
                  <Link className="bo-link" to={`/organizations/${org.id}`}>
                    {org.name}
                  </Link>
                )}
                {showTargets && artist && (
                  <Link className="bo-link" to={`/artists/${artist.id}`}>
                    {artist.stageName}
                  </Link>
                )}
              </div>
              <p>{i.summary}</p>
              <div className="crm-event-foot">
                <span className="bo-muted">{fill(t('loggedBy'), { name: staffName(i.authorId) })}</span>
                {i.followUpAt && (
                  <span className={i.followUpDone ? 'crm-follow done' : overdue ? 'crm-follow overdue' : 'crm-follow'}>
                    {fill(t('followUpOn'), { date: date(i.followUpAt) })}
                    {i.followUpDone ? ` · ${t('followUpDone')}` : overdue ? ` · ${t('followUpOverdue')}` : ''}
                  </span>
                )}
                {i.followUpAt && !i.followUpDone && canEdit && (
                  <button type="button" className="bo-btn ghost small" onClick={() => onDone(i.id)}>
                    {t('markDone')}
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
