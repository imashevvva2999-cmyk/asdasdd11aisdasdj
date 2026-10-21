import { useEffect, useId, useRef, useState } from 'react';

import { PermissionNote } from '@mmusic/backoffice/ui';

import { usePreferences } from '@/access';
import { useCrmActions, type ActionResult } from '@/data/actions';
import { AGENDA_SIZES } from '@/domain/settings';
import { TASK_PRIORITIES, type CrmPreferences } from '@/domain/types';
import { PRIORITY_KEYS } from '@/strings';
import { SelectField, useCrm } from '@/ui';

/** Parts of the CRM settings page (M6): result notice, the choice dialog and the preferences form. */

export function Notice({ result }: { result: ActionResult | null }) {
  const { t, resultError } = useCrm();
  if (!result) return null;
  return result.ok ? (
    <output className="bo-saved">{t('savedNotice')}</output>
  ) : (
    <p className="bo-field-error" role="alert">
      {resultError(result)}
    </p>
  );
}

/** A confirmation dialog with one required choice (where to move the deals of a stage being disabled). */
export function ChoiceDialog({ open, title, body, label, options, value, onChange, confirmLabel, error, onConfirm, onCancel }: { open: boolean; title: string; body: string; label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; confirmLabel: string; error?: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useCrm();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="bo-dialog" aria-labelledby={titleId} onClose={() => open && onCancel()}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <h2 id={titleId}>{title}</h2>
        <p>{body}</p>
        <SelectField label={label} required value={value} onChange={onChange} options={[{ value: '', label: '—' }, ...options]} error={error} />
        <div className="bo-dialog-actions">
          <button type="button" className="bo-btn ghost" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button type="submit" className="bo-btn danger">
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

// ---------------------------------------------------------------- preferences

export function PreferenceSettings() {
  const { t } = useCrm();
  const actions = useCrmActions();
  const prefs = usePreferences();
  const [draft, setDraft] = useState<Pick<CrmPreferences, 'dealsView' | 'agendaSize' | 'taskPriority'>>({ dealsView: prefs.dealsView, agendaSize: prefs.agendaSize, taskPriority: prefs.taskPriority });
  const [result, setResult] = useState<ActionResult | null>(null);
  const save = async () => setResult(await actions.updatePreferences(draft));
  return (
    <form
      className="bo-card crm-form"
      aria-label={t('tabPreferences')}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <PermissionNote icon="info-outline" text={t('prefsNote')} />
      </div>
      <div className="crm-form-grid">
        <SelectField label={t('fieldDealsView')} value={draft.dealsView} onChange={(v) => setDraft((d) => ({ ...d, dealsView: v as 'board' | 'list' }))} options={[{ value: 'board', label: t('viewBoard') }, { value: 'list', label: t('viewList') }]} />
        <SelectField label={t('fieldAgendaSize')} value={String(draft.agendaSize)} onChange={(v) => setDraft((d) => ({ ...d, agendaSize: Number(v) }))} options={AGENDA_SIZES.map((n) => ({ value: String(n), label: String(n) }))} />
        <SelectField label={t('fieldTaskPriority')} value={draft.taskPriority} onChange={(v) => setDraft((d) => ({ ...d, taskPriority: v as CrmPreferences['taskPriority'] }))} options={TASK_PRIORITIES.map((p) => ({ value: p, label: t(PRIORITY_KEYS[p]) }))} />
      </div>
      <Notice result={result} />
      <button type="submit" className="bo-btn">
        {t('save')}
      </button>
    </form>
  );
}
