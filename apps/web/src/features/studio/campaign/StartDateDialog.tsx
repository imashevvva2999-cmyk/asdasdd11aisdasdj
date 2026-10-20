import { useEffect, useRef, useState } from 'react';

import { isValidStartDate, parseIsoDay, toIsoDay } from '@mmusic/core/state/campaign-store';

export type StartDateLabels = { title: string; ends: string; cancel: string; apply: string };

/**
 * Campaign start-date picker (mobile promotion-stitch/start-date-popover.tsx) — the browser's native date input
 * limited to today … one year ahead (campaign-store isValidStartDate), with the end day derived live from the
 * package duration. Apply only accepts a valid day.
 */
export function StartDateDialog({ value, durationDays, locale, labels, onApply, onClose }: { value: string; durationDays: number; locale: 'en' | 'ru'; labels: StartDateLabels; onApply: (iso: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(value);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const [today] = useState(() => new Date());
  const min = toIsoDay(today);
  const max = toIsoDay(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()));
  const valid = isValidStartDate(selected);
  const day = parseIsoDay(selected) ?? today;
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + durationDays);
  const fmt = (d: Date) => d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <dialog
      ref={ref}
      className="st-dialog cp-date-dialog"
      aria-label={labels.title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <h2 className="t-headline-sm">{labels.title}</h2>
      <input className="ui-input" type="date" min={min} max={max} value={selected} aria-label={labels.title} onChange={(e) => setSelected(e.target.value)} />
      <p className="t-body-md medium">
        {labels.ends}: {valid ? fmt(end) : '—'}
      </p>
      <div className="st-dialog-actions">
        <button type="button" className="ui-btn ghost" onClick={onClose}>
          {labels.cancel}
        </button>
        <button
          type="button"
          className="ui-btn"
          disabled={!valid}
          onClick={() => {
            onApply(selected);
            onClose();
          }}
        >
          {labels.apply}
        </button>
      </div>
    </dialog>
  );
}
