import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { useBackoffice, useCollection } from '@mmusic/backoffice/react';
import { BackLink, DemoBadge, EmptyState, PageHeader, PermissionNote } from '@mmusic/backoffice/ui';

import { useCrmActor, usePipeline } from '@/access';
import { useCrmActions } from '@/data/actions';
import { dealInput, type DealField, type DealInput } from '@/domain/pipeline';
import type { FieldErrors } from '@/domain/rules';
import type { CrmArtist, CrmContact, CrmOrganization, Deal } from '@/domain/types';
import { SelectField, TextAreaField, TextField, useCrm } from '@/ui';

/**
 * Create (/deals/new, optional ?organizationId= or ?artistId=) or edit (/deals/:id/edit) a demo deal; permission
 * crm.deals.edit. The counterparty is a group / organization or (unified CRM) a solo artist.
 */
export function DealFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t, fieldError, resultError } = useCrm();
  const navigate = useNavigate();
  const actions = useCrmActions();
  const bo = useBackoffice();
  const { staff: actor } = useCrmActor();
  const organizations = useCollection<CrmOrganization>('organizations');
  const contacts = useCollection<CrmContact>('contacts');
  const artists = useCollection<CrmArtist>('artists');
  const existing = useCollection<Deal>('deals').find((d) => d.id === id);
  const staff = bo.staff.filter((s) => s.app === 'crm');
  const pipeline = usePipeline();
  const [input, setInput] = useState<DealInput>(() => {
    const base = dealInput(existing, actor?.app === 'crm' ? actor.id : '');
    return existing ? base : { ...base, organizationId: params.get('organizationId') ?? '', artistId: params.get('artistId') ?? '', stage: pipeline.openIds[0] ?? base.stage };
  });
  const [withArtist, setWithArtist] = useState(() => !!(existing?.artistId ?? params.get('artistId')));
  const [secondKind, setSecondKind] = useState<'' | 'organization' | 'artist'>(() => (existing?.secondaryArtistId ? 'artist' : existing?.secondaryOrganizationId ? 'organization' : ''));
  const [fields, setFields] = useState<FieldErrors<DealField>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const back = id ? <BackLink to={`/deals/${id}`} label={existing?.title ?? t('backToDeals')} /> : <BackLink to="/deals" label={t('backToDeals')} />;
  if (id && !existing) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('dealNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const set = (key: DealField) => (value: string) => {
    setInput((s) => ({ ...s, [key]: value, ...(key === 'organizationId' ? { contactId: '' } : {}) }));
    setFields((f) => ({ ...f, [key]: undefined }));
  };
  const submit = async () => {
    setBusy(true);
    const out = id ? await actions.updateDeal(id, input) : await actions.createDeal(input);
    setBusy(false);
    if (out.ok) return navigate(`/deals/${out.id}`);
    setError(resultError(out));
    if (out.error === 'invalid') setFields(out.fields);
  };
  // A deal with an artist may name any contact (e.g. the manager); a deal with an organization, only its people.
  const orgContacts = (withArtist ? contacts : contacts.filter((c) => c.organizationId === input.organizationId)).sort((a, b) => a.name.localeCompare(b.name));
  const switchSecond = (kind: '' | 'organization' | 'artist') => {
    setSecondKind(kind);
    setInput((st) => ({ ...st, secondaryOrganizationId: '', secondaryArtistId: '' }));
    setFields((f) => ({ ...f, secondaryOrganizationId: undefined, secondaryArtistId: undefined }));
  };
  // The secondary participant can never be the primary counterparty: it is left out of the choices.
  const secondOrgs = [...organizations].filter((o) => withArtist || o.id !== input.organizationId).sort((a, b) => a.name.localeCompare(b.name));
  const secondArtists = [...artists].filter((a) => !withArtist || a.id !== input.artistId).sort((a, b) => a.stageName.localeCompare(b.stageName));
  const switchTo = (artist: boolean) => {
    setWithArtist(artist);
    setInput((st) => ({ ...st, organizationId: '', artistId: '', contactId: '', ...(secondKind === (artist ? 'artist' : 'organization') ? { secondaryOrganizationId: '', secondaryArtistId: '' } : {}) }));
    setFields((f) => ({ ...f, organizationId: undefined, artistId: undefined }));
  };

  return (
    <>
      {back}
      <PageHeader title={id ? t('editDeal') : t('newDeal')} subtitle={existing?.title} actions={<DemoBadge />} />
      <form
        className="bo-card crm-form"
        aria-label={id ? t('editDeal') : t('newDeal')}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void submit();
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <PermissionNote icon="science" text={t('fieldEstimateHint')} />
        </div>
        <TextField label={t('fieldTitle')} required value={input.title} onChange={set('title')} error={fieldError(fields.title)} />
        <div className="crm-form-grid">
          <SelectField
            label={t('primaryCounterparty')}
            value={withArtist ? 'artist' : 'organization'}
            onChange={(v) => switchTo(v === 'artist')}
            options={[
              { value: 'organization', label: t('counterpartyOrg') },
              { value: 'artist', label: t('counterpartyArtist') },
            ]}
          />
          {withArtist ? (
            <SelectField
              label={t('fieldArtist')}
              required
              value={input.artistId ?? ''}
              onChange={set('artistId')}
              error={fieldError(fields.artistId ?? fields.organizationId)}
              options={[{ value: '', label: '—' }, ...[...artists].sort((a, b) => a.stageName.localeCompare(b.stageName)).map((a) => ({ value: a.id, label: a.stageName }))]}
            />
          ) : (
            <SelectField
              label={t('fieldOrganization')}
              required
              value={input.organizationId}
              onChange={set('organizationId')}
              error={fieldError(fields.organizationId)}
              options={[{ value: '', label: '—' }, ...[...organizations].sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ value: o.id, label: o.name }))]}
            />
          )}
          <SelectField
            label={t('secondaryParticipant')}
            value={secondKind}
            onChange={(v) => switchSecond(v as '' | 'organization' | 'artist')}
            hint={t('secondaryHint')}
            options={[
              { value: '', label: t('secondaryNone') },
              { value: 'organization', label: t('counterpartyOrg') },
              { value: 'artist', label: t('counterpartyArtist') },
            ]}
          />
          {secondKind === 'organization' && (
            <SelectField
              label={`${t('secondaryParticipant')}: ${t('counterpartyOrg')}`}
              value={input.secondaryOrganizationId ?? ''}
              onChange={set('secondaryOrganizationId')}
              error={fieldError(fields.secondaryOrganizationId)}
              options={[{ value: '', label: '—' }, ...secondOrgs.map((o) => ({ value: o.id, label: o.name }))]}
            />
          )}
          {secondKind === 'artist' && (
            <SelectField
              label={`${t('secondaryParticipant')}: ${t('counterpartyArtist')}`}
              value={input.secondaryArtistId ?? ''}
              onChange={set('secondaryArtistId')}
              error={fieldError(fields.secondaryArtistId)}
              options={[{ value: '', label: '—' }, ...secondArtists.map((a) => ({ value: a.id, label: a.stageName }))]}
            />
          )}
          <SelectField label={t('fieldContact')} value={input.contactId} onChange={set('contactId')} error={fieldError(fields.contactId)} options={[{ value: '', label: t('none') }, ...orgContacts.map((c) => ({ value: c.id, label: c.name }))]} />
          <SelectField label={t('fieldOwner')} required value={input.ownerId} onChange={set('ownerId')} error={fieldError(fields.ownerId)} options={[{ value: '', label: '—' }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} />
          {!id && <SelectField label={t('fieldStage')} value={input.stage} onChange={set('stage')} error={fieldError(fields.stage)} options={pipeline.open.map((s) => ({ value: s.id, label: pipeline.label(s.id) }))} />}
          <TextField label={t('fieldEstimate')} value={input.estimatedValue} onChange={set('estimatedValue')} error={fieldError(fields.estimatedValue)} placeholder="50 000" />
          <TextField label={t('fieldExpectedClose')} type="date" value={input.expectedCloseAt} onChange={set('expectedCloseAt')} error={fieldError(fields.expectedCloseAt)} />
        </div>
        <TextAreaField label={t('fieldDescription')} value={input.description} onChange={set('description')} error={fieldError(fields.description)} />
        {error && (
          <p className="bo-field-error" role="alert">
            {error}
          </p>
        )}
        <div className="crm-form-actions">
          <button type="submit" className="bo-btn" disabled={busy} aria-busy={busy}>
            {t('save')}
          </button>
          <button type="button" className="bo-btn ghost" disabled={busy} onClick={() => navigate(id ? `/deals/${id}` : '/deals')}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </>
  );
}
