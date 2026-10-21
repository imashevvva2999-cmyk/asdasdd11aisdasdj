import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

import type { ActivityEvent, Locale } from '@mmusic/backoffice/domain';
import { formatNumber } from '@mmusic/backoffice/i18n';
import { useBackoffice, useLocale, useLocalized, useRole, useT } from '@mmusic/backoffice/react';
import { StatusBadge, type StatusTone } from '@mmusic/backoffice/ui';

import type { ActionResult } from '@/data/actions';
import type { FieldError } from '@/domain/rules';
import type { ContactStatus, CrmContact, CrmOrganization, DealStage, Interaction, RelationshipStatus, TaskPriority, TaskStatus } from '@/domain/types';
import { CRM_STRINGS, DEAL_STAGE_KEYS, fill, INTERACTION_KIND_KEYS, PRIORITY_KEYS, RELATIONSHIP_LABELS, TASK_STATUS_KEYS, type CrmStringKey } from '@/strings';

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
    resultError: (r: ActionResult) =>
      r.ok ? undefined : r.error === 'forbidden' ? t('errForbidden') : r.error === 'not-found' ? t('errNotFound') : r.error === 'same-status' ? t('errSameStatus') : r.error === 'invalid-transition' ? t('errInvalidTransition') : t('errInvalid'),
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

export const STAGE_TONE: Record<DealStage, StatusTone> = { lead: 'neutral', qualified: 'pending', proposal: 'pending', negotiation: 'warning', won: 'success', lost: 'danger' };

export function DealStageBadge({ stage }: { stage: DealStage }) {
  const { t } = useCrm();
  return <StatusBadge tone={STAGE_TONE[stage]} label={t(DEAL_STAGE_KEYS[stage])} />;
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
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  if (sorted.length === 0) return <p className="bo-muted">{t('noChanges')}</p>;
  const statusText = (s: string) =>
    s in RELATIONSHIP_LABELS
      ? l(RELATIONSHIP_LABELS[s as RelationshipStatus])
      : s in DEAL_STAGE_KEYS
        ? t(DEAL_STAGE_KEYS[s as DealStage])
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
              <td className="muted">{[e.fromStatus && e.toStatus ? `${statusText(e.fromStatus)} → ${statusText(e.toStatus)}` : e.toStatus ? statusText(e.toStatus) : '', e.reason ?? ''].filter(Boolean).join(' · ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Interactions as a chronological timeline (newest first), with contact / organization links and follow-ups. */
export function Timeline({ items, contacts, organizations, now, canEdit, onDone, showTargets = true }: { items: Interaction[]; contacts: CrmContact[]; organizations: CrmOrganization[]; now: string; canEdit: boolean; onDone: (id: string) => void; showTargets?: boolean }) {
  const { t, date, staffName } = useCrm();
  if (items.length === 0) return <p className="bo-muted">{t('noInteractions')}</p>;
  return (
    <ol className="crm-timeline">
      {items.map((i) => {
        const contact = contacts.find((c) => c.id === i.contactId);
        const org = organizations.find((o) => o.id === i.organizationId);
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
