import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';

import { Icon, type IconName } from '@mmusic/ui-kit/web';

import { MIN_REASON_LENGTH } from '../review.ts';
import { useShellStrings } from '../react.tsx';

/** Coloured status pill. `tone` carries the meaning; the label is always visible text (not colour alone). */
export type StatusTone = 'pending' | 'success' | 'danger' | 'warning' | 'neutral';

export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  return <span className={`bo-status ${tone}`}>{label}</span>;
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const s = useShellStrings();
  return (
    <label className="bo-search">
      <Icon name="search" size={18} />
      <input type="search" value={value} placeholder={placeholder ?? s('searchLabel')} aria-label={placeholder ?? s('searchLabel')} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export type SelectOption = { value: string; label: string };

export function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: SelectOption[]; onChange: (value: string) => void }) {
  return (
    <label className="bo-filter">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ children, summary }: { children: ReactNode; summary?: string }) {
  return (
    <div className="bo-filterbar">
      <div className="bo-filterbar-controls">{children}</div>
      {summary && <span className="bo-filterbar-summary">{summary}</span>}
    </div>
  );
}

export function BackLink({ to, label }: { to: string; label?: string }) {
  const s = useShellStrings();
  return (
    <Link className="bo-back" to={to}>
      <Icon name="arrow-back" size={18} />
      {label ?? s('back')}
    </Link>
  );
}

/** Label / value rows of a detail page. */
export function DetailList({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="bo-dl">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** States that role-based limits are a prototype convenience, not protection. */
export function PermissionNote({ icon = 'info-outline', text }: { icon?: IconName; text?: string }) {
  const s = useShellStrings();
  return (
    <p className="bo-perm-note">
      <Icon name={icon} size={16} />
      {text ?? s('permissionsNote')}
    </p>
  );
}

export type ReasonField = { required: boolean; value: string; onChange: (value: string) => void; error?: string };

/**
 * Confirmation dialog for a decision. With `reason`, a reason field is shown (mandatory reasons enforce the
 * shared minimum length, the error comes from the caller's validation). `busy` disables the buttons while saving.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  reason,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  danger?: boolean;
  reason?: ReasonField;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const s = useShellStrings();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reasonId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="bo-dialog" aria-labelledby={titleId} onClose={() => open && onCancel()}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) onConfirm();
        }}
      >
        <h2 id={titleId}>{title}</h2>
        {body && <p>{body}</p>}
        {reason && (
          <div className="bo-field">
            <label htmlFor={reasonId}>
              {s('reasonLabel')}
              {reason.required ? ' *' : ''}
            </label>
            <textarea id={reasonId} rows={4} value={reason.value} aria-invalid={!!reason.error} onChange={(e) => reason.onChange(e.target.value)} />
            <span className="bo-field-hint">{reason.required ? `${s('reasonHintRequired')} ${MIN_REASON_LENGTH}.` : s('reasonHintOptional')}</span>
            {reason.error && (
              <span className="bo-field-error" role="alert">
                {reason.error}
              </span>
            )}
          </div>
        )}
        {error && !reason?.error && (
          <p className="bo-field-error" role="alert">
            {error}
          </p>
        )}
        <div className="bo-dialog-actions">
          <button type="button" className="bo-btn ghost" disabled={busy} onClick={onCancel}>
            {s('cancel')}
          </button>
          <button type="submit" className={danger ? 'bo-btn danger' : 'bo-btn'} disabled={busy} aria-busy={busy}>
            {busy ? s('saving') : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
