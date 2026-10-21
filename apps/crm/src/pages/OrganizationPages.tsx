import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import type { ActivityEvent, OrganizationKind } from '@mmusic/backoffice/domain';
import { useCan, useCollection } from '@mmusic/backoffice/react';
import { BackLink, ConfirmDialog, DemoBadge, DetailList, EmptyState, FilterBar, FilterSelect, PageHeader, PermissionNote, SearchField } from '@mmusic/backoffice/ui';

import { InteractionForm } from '@/components/InteractionForm';
import { useCrmActions } from '@/data/actions';
import { organizationInput, sortByDate, type FieldErrors, type OrganizationField, type OrganizationInput } from '@/domain/rules';
import { RELATIONSHIP_STATUSES, type CrmContact, type CrmOrganization, type Interaction, type RelationshipStatus } from '@/domain/types';
import { fill, ORGANIZATION_KIND_LABELS, RELATIONSHIP_LABELS } from '@/strings';
import { AuditTable, ContactStatusBadge, matches, RelationshipBadge, SelectField, TextAreaField, TextField, Timeline, useCrm, useNow, useQueryState, ViewOnly } from '@/ui';

const KINDS = Object.keys(ORGANIZATION_KIND_LABELS) as OrganizationKind[];

/** Fictional organizations: search, type and relationship filters kept in the URL. */
export function OrganizationsPage() {
  const { t, l, date } = useCrm();
  const canEdit = useCan('crm.organizations.edit');
  const organizations = useCollection<CrmOrganization>('organizations');
  const contacts = useCollection<CrmContact>('contacts');
  const interactions = useCollection<Interaction>('interactions');
  const query = useQueryState();
  const q = query.get('q');
  const kind = query.get('kind');
  const rel = query.get('rel');
  const rows = organizations
    .filter((o) => (!kind || o.kind === kind) && (!rel || o.relationship === rel) && (!q || matches(`${o.name} ${o.city}`, q)))
    .sort((a, b) => RELATIONSHIP_STATUSES.indexOf(b.relationship) - RELATIONSHIP_STATUSES.indexOf(a.relationship) || a.name.localeCompare(b.name));
  const last = (id: string) => sortByDate(interactions.filter((i) => i.organizationId === id))[0]?.at;

  return (
    <>
      <PageHeader
        title={t('organizationsTitle')}
        subtitle={t('organizationsSubtitle')}
        actions={
          <span className="crm-head-actions">
            <DemoBadge />
            {canEdit && (
              <Link className="bo-btn small" to="/organizations/new">
                {t('newOrganization')}
              </Link>
            )}
          </span>
        }
      />
      {!canEdit && <ViewOnly />}
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: organizations.length })}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchOrganizations')} />
        <FilterSelect label={t('filterOrgKind')} value={kind} onChange={(v) => query.set('kind', v)} options={[{ value: '', label: '—' }, ...KINDS.map((k) => ({ value: k, label: l(ORGANIZATION_KIND_LABELS[k]) }))]} />
        <FilterSelect label={t('filterRelationship')} value={rel} onChange={(v) => query.set('rel', v)} options={[{ value: '', label: '—' }, ...RELATIONSHIP_STATUSES.map((s) => ({ value: s, label: l(RELATIONSHIP_LABELS[s]) }))]} />
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState icon="search-off" title={t('emptyFiltered')} body={t('emptyFilteredHint')}>
          <button type="button" className="bo-btn ghost" onClick={query.clear}>
            {t('clearFilters')}
          </button>
        </EmptyState>
      ) : (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th>{t('colName')}</th>
                <th>{t('colKind')}</th>
                <th>{t('colCity')}</th>
                <th>{t('colRelationship')}</th>
                <th>{t('colContacts')}</th>
                <th>{t('colLastInteraction')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link className="bo-link" to={`/organizations/${o.id}`}>
                      {o.name}
                    </Link>
                  </td>
                  <td className="muted">{l(ORGANIZATION_KIND_LABELS[o.kind])}</td>
                  <td className="muted">{o.city}</td>
                  <td>
                    <RelationshipBadge status={o.relationship} />
                  </td>
                  <td className="muted">{contacts.filter((c) => c.organizationId === o.id).length}</td>
                  <td className="muted nowrap">{date(last(o.id))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function OrganizationDetailPage() {
  const { id = '' } = useParams();
  const { t, l, date, resultError } = useCrm();
  const actions = useCrmActions();
  const now = useNow();
  const canEdit = useCan('crm.organizations.edit');
  const canPartners = useCan('crm.partners.edit');
  const canContacts = useCan('crm.contacts.edit');
  const canLog = useCan('crm.activity.edit');
  const organizations = useCollection<CrmOrganization>('organizations');
  const contacts = useCollection<CrmContact>('contacts');
  const interactions = useCollection<Interaction>('interactions');
  const events = useCollection<ActivityEvent>('activity');
  const [to, setTo] = useState<RelationshipStatus | ''>('');
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState(false);
  const [link, setLink] = useState('');
  const [logging, setLogging] = useState(false);
  const org = organizations.find((o) => o.id === id);
  const back = <BackLink to="/organizations" label={t('backToOrganizations')} />;
  if (!org) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('organizationNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const members = contacts.filter((c) => c.organizationId === org.id).sort((a, b) => a.name.localeCompare(b.name));
  const free = contacts.filter((c) => !c.organizationId).sort((a, b) => a.name.localeCompare(b.name));
  const details: [string, ReactNode][] = [
    [t('fieldKind'), l(ORGANIZATION_KIND_LABELS[org.kind])],
    [t('fieldCity'), org.city],
    [t('fieldAbout'), org.about || '—'],
    [t('fieldRelationship'), <RelationshipBadge key="r" status={org.relationship} />],
    ...(org.relationshipChangedAt ? ([[t('fieldRelationshipChanged'), date(org.relationshipChangedAt)]] as [string, ReactNode][]) : []),
    [t('fieldCreated'), date(org.createdAt)],
    ...(org.updatedAt ? ([[t('fieldUpdated'), date(org.updatedAt)]] as [string, ReactNode][]) : []),
  ];
  const confirm = async () => {
    if (!to) return;
    setBusy(true);
    const out = await actions.changeRelationship(org.id, to, note);
    setBusy(false);
    if (!out.ok) return setError(resultError(out));
    setConfirming(false);
    setTo('');
    setNotice(true);
  };
  const doLink = async (contactId: string, orgId: string) => {
    const out = await actions.linkContact(contactId, orgId);
    if (out.ok) setLink('');
  };

  return (
    <>
      {back}
      <PageHeader
        title={org.name}
        subtitle={`${l(ORGANIZATION_KIND_LABELS[org.kind])} · ${org.city}`}
        actions={
          <span className="crm-head-actions">
            <RelationshipBadge status={org.relationship} />
            <DemoBadge />
            {canEdit && (
              <Link className="bo-btn small ghost" to={`/organizations/${org.id}/edit`}>
                {t('edit')}
              </Link>
            )}
          </span>
        }
      />
      <div className="bo-detail-grid">
        <section className="bo-card" aria-label={t('detailsTitle')}>
          <h2>{t('detailsTitle')}</h2>
          <DetailList items={details} />
        </section>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <section className="bo-card" aria-label={t('relationshipTitle')}>
            <h2>{t('relationshipTitle')}</h2>
            <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
              {t('relationshipHint')}
            </p>
            {canPartners ? (
              <div className="crm-form-grid" style={{ alignItems: 'end' }}>
                <SelectField label={t('relationshipTo')} value={to} onChange={(v) => setTo(v as RelationshipStatus | '')} options={[{ value: '', label: '—' }, ...RELATIONSHIP_STATUSES.filter((s) => s !== org.relationship).map((s) => ({ value: s, label: l(RELATIONSHIP_LABELS[s]) }))]} />
                <div className="bo-field">
                  <button
                    type="button"
                    className="bo-btn"
                    disabled={!to}
                    onClick={() => {
                      setNote('');
                      setError(undefined);
                      setNotice(false);
                      setConfirming(true);
                    }}
                  >
                    {t('changeRelationship')}
                  </button>
                </div>
              </div>
            ) : (
              <ViewOnly />
            )}
            {notice && <output className="bo-saved">{t('savedNotice')}</output>}
            <PermissionNote />
          </section>
          <section className="bo-card" aria-label={t('orgContacts')}>
            <h2>{t('orgContacts')}</h2>
            {members.length === 0 ? (
              <p className="bo-muted">{t('noOrgContacts')}</p>
            ) : (
              <ul className="bo-list">
                {members.map((c) => (
                  <li key={c.id}>
                    <span className="grow">
                      <Link className="bo-link bo-ellipsis" to={`/contacts/${c.id}`}>
                        {c.name}
                      </Link>
                      <span className="bo-muted bo-ellipsis" style={{ fontSize: 13 }}>
                        {l(c.position)}
                      </span>
                    </span>
                    <ContactStatusBadge status={c.status} />
                    {canContacts && (
                      <button type="button" className="bo-btn ghost small" onClick={() => void doLink(c.id, '')}>
                        {t('unlinkAction')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canContacts &&
              (free.length === 0 ? (
                <p className="bo-muted" style={{ fontSize: 13, marginBottom: 0 }}>
                  {t('noFreeContacts')}
                </p>
              ) : (
                <div className="crm-form-grid" style={{ alignItems: 'end', marginTop: 12 }}>
                  <SelectField label={t('linkContactSelect')} value={link} onChange={setLink} options={[{ value: '', label: '—' }, ...free.map((c) => ({ value: c.id, label: c.name }))]} />
                  <div className="bo-field">
                    <button type="button" className="bo-btn ghost" disabled={!link} onClick={() => void doLink(link, org.id)}>
                      {t('linkAction')}
                    </button>
                  </div>
                </div>
              ))}
          </section>
        </div>
      </div>
      <section className="bo-card bo-section" aria-label={t('timelineTitle')}>
        <h2>{t('timelineTitle')}</h2>
        {canLog ? (
          !logging && (
            <div className="bo-actions">
              <button type="button" className="bo-btn small" onClick={() => setLogging(true)}>
                {t('logInteraction')}
              </button>
            </div>
          )
        ) : (
          <ViewOnly />
        )}
        {logging && <InteractionForm organizationId={org.id} onClose={() => setLogging(false)} />}
        <Timeline items={sortByDate(interactions.filter((i) => i.organizationId === org.id))} contacts={contacts} organizations={organizations} now={now} canEdit={canLog} onDone={(i) => void actions.completeFollowUp(i)} />
      </section>
      <section className="bo-section" aria-label={t('changeHistory')}>
        <h2>{t('changeHistory')}</h2>
        <AuditTable events={events.filter((e) => e.entity.type === 'organization' && e.entity.id === org.id)} />
      </section>
      <ConfirmDialog
        open={confirming}
        title={fill(t('confirmRelationship'), { name: org.name })}
        body={`${l(RELATIONSHIP_LABELS[org.relationship])} → ${to ? l(RELATIONSHIP_LABELS[to]) : ''}. ${t('confirmRelationshipBody')}`}
        confirmLabel={t('changeRelationship')}
        reason={{ required: false, value: note, onChange: setNote }}
        busy={busy}
        error={error}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/** Create (/organizations/new) or edit (/organizations/:id/edit); permission crm.organizations.edit. */
export function OrganizationFormPage() {
  const { id } = useParams();
  const { t, l, fieldError, resultError } = useCrm();
  const navigate = useNavigate();
  const actions = useCrmActions();
  const existing = useCollection<CrmOrganization>('organizations').find((o) => o.id === id);
  const [input, setInput] = useState<OrganizationInput>(() => organizationInput(existing));
  const [fields, setFields] = useState<FieldErrors<OrganizationField>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const back = id ? <BackLink to={`/organizations/${id}`} label={existing?.name ?? t('backToOrganizations')} /> : <BackLink to="/organizations" label={t('backToOrganizations')} />;
  if (id && !existing) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('organizationNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const set = (key: OrganizationField) => (value: string) => {
    setInput((s) => ({ ...s, [key]: value }));
    setFields((f) => ({ ...f, [key]: undefined }));
  };
  const submit = async () => {
    setBusy(true);
    const out = id ? await actions.updateOrganization(id, input) : await actions.createOrganization(input);
    setBusy(false);
    if (out.ok) return navigate(`/organizations/${out.id}`);
    setError(resultError(out));
    if (out.error === 'invalid') setFields(out.fields);
  };

  return (
    <>
      {back}
      <PageHeader title={id ? t('editOrganization') : t('newOrganization')} subtitle={existing?.name} actions={<DemoBadge />} />
      <form
        className="bo-card crm-form"
        aria-label={id ? t('editOrganization') : t('newOrganization')}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void submit();
        }}
      >
        {!id && (
          <div style={{ marginBottom: 16 }}>
            <PermissionNote icon="science" text={`${t('newOrgHint')} ${t('fieldAboutHint')}`} />
          </div>
        )}
        <div className="crm-form-grid">
          <TextField label={t('fieldOrgName')} required value={input.name} onChange={set('name')} error={fieldError(fields.name)} />
          <SelectField label={t('fieldKind')} value={input.kind} onChange={set('kind')} options={KINDS.map((k) => ({ value: k, label: l(ORGANIZATION_KIND_LABELS[k]) }))} />
          <TextField label={t('fieldCity')} required value={input.city} onChange={set('city')} error={fieldError(fields.city)} />
        </div>
        <TextAreaField label={t('fieldAbout')} value={input.about} onChange={set('about')} error={fieldError(fields.about)} hint={t('fieldAboutHint')} />
        {error && (
          <p className="bo-field-error" role="alert">
            {error}
          </p>
        )}
        <div className="crm-form-actions">
          <button type="submit" className="bo-btn" disabled={busy} aria-busy={busy}>
            {t('save')}
          </button>
          <button type="button" className="bo-btn ghost" disabled={busy} onClick={() => navigate(id ? `/organizations/${id}` : '/organizations')}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </>
  );
}
