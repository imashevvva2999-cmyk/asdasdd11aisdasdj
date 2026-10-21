import { useState } from 'react';

import { useCollection } from '@mmusic/backoffice/react';

import { useCrmActions } from '@/data/actions';
import type { FieldErrors, InteractionField, InteractionInput } from '@/domain/rules';
import { INTERACTION_KINDS, type CrmArtist, type CrmContact, type CrmOrganization, type InteractionKind } from '@/domain/types';
import { INTERACTION_KIND_KEYS } from '@/strings';
import { SelectField, TextAreaField, TextField, toLocalInput, useCrm } from '@/ui';

/**
 * Logs a meeting, call, e-mail or note (permission crm.activity.edit). Opened from the interactions page or from a
 * contact / organization / artist, which preselects the target. A contact's organization is attached automatically.
 */
export function InteractionForm({ contactId = '', organizationId = '', artistId = '', kind = 'meeting', onClose }: { contactId?: string; organizationId?: string; artistId?: string; kind?: InteractionKind; onClose: (saved: boolean) => void }) {
  const { t, fieldError, resultError } = useCrm();
  const actions = useCrmActions();
  const contacts = useCollection<CrmContact>('contacts');
  const organizations = useCollection<CrmOrganization>('organizations');
  const artists = useCollection<CrmArtist>('artists');
  const [input, setInput] = useState<InteractionInput>(() => ({ kind, at: toLocalInput(new Date().toISOString()), summary: '', contactId, organizationId, artistId, followUpAt: '' }));
  const [fields, setFields] = useState<FieldErrors<InteractionField>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (key: InteractionField) => (value: string) => {
    setInput((s) => ({ ...s, [key]: value }));
    setFields((f) => ({ ...f, [key]: undefined }));
  };

  const submit = async () => {
    setBusy(true);
    const out = await actions.logInteraction(input);
    setBusy(false);
    if (out.ok) return onClose(true);
    setError(resultError(out));
    if (out.error === 'invalid') setFields(out.fields);
  };

  return (
    <form
      className="bo-card crm-form"
      aria-label={t('logInteraction')}
      style={{ marginBottom: 16, maxWidth: 'none' }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) void submit();
      }}
    >
      <h2>{t('logInteraction')}</h2>
      <div className="crm-form-grid">
        <SelectField label={t('fieldInteractionKind')} value={input.kind} onChange={set('kind')} options={INTERACTION_KINDS.map((k) => ({ value: k, label: t(INTERACTION_KIND_KEYS[k]) }))} />
        <TextField label={t('fieldWhen')} type="datetime-local" required value={input.at} onChange={set('at')} error={fieldError(fields.at)} />
        <SelectField
          label={t('fieldContact')}
          value={input.contactId}
          onChange={set('contactId')}
          error={fieldError(fields.contactId)}
          options={[{ value: '', label: t('none') }, ...[...contacts].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name }))]}
        />
        <SelectField
          label={t('fieldOrganization')}
          value={input.organizationId}
          onChange={set('organizationId')}
          error={fieldError(fields.organizationId)}
          options={[{ value: '', label: t('none') }, ...[...organizations].sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ value: o.id, label: o.name }))]}
        />
        <SelectField
          label={t('fieldArtist')}
          value={input.artistId ?? ''}
          onChange={set('artistId')}
          error={fieldError(fields.artistId)}
          options={[{ value: '', label: t('none') }, ...[...artists].sort((a, b) => a.stageName.localeCompare(b.stageName)).map((a) => ({ value: a.id, label: a.stageName }))]}
        />
      </div>
      <TextAreaField label={t('fieldSummary')} required value={input.summary} onChange={set('summary')} error={fieldError(fields.summary)} hint={t('fieldSummaryHint')} />
      <div className="crm-form-grid">
        <TextField label={t('fieldFollowUp')} type="datetime-local" value={input.followUpAt} onChange={set('followUpAt')} error={fieldError(fields.followUpAt)} />
      </div>
      {error && (
        <p className="bo-field-error" role="alert">
          {error}
        </p>
      )}
      <div className="crm-form-actions">
        <button type="submit" className="bo-btn" disabled={busy} aria-busy={busy}>
          {t('logSubmit')}
        </button>
        <button type="button" className="bo-btn ghost" disabled={busy} onClick={() => onClose(false)}>
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
