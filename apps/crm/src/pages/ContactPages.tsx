import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useCan, useCollection } from '@mmusic/backoffice/react';
import { BackLink, DemoBadge, DetailList, EmptyState, FilterBar, FilterSelect, PageHeader, PermissionNote, SearchField } from '@mmusic/backoffice/ui';

import { InteractionForm } from '@/components/InteractionForm';
import { useCrmActions } from '@/data/actions';
import { contactInput, sortByDate, type ContactField, type ContactInput, type FieldErrors } from '@/domain/rules';
import type { CrmContact, CrmOrganization, Interaction, InteractionKind } from '@/domain/types';
import { fill } from '@/strings';
import { AuditTable, ContactStatusBadge, matches, SelectField, TextField, Timeline, useCrm, useNow, useQueryState, ViewOnly } from '@/ui';

/** Fictional contacts: search, status / organization / tag filters kept in the URL. */
export function ContactsPage() {
  const { t, l, date } = useCrm();
  const canEdit = useCan('crm.contacts.edit');
  const contacts = useCollection<CrmContact>('contacts');
  const organizations = useCollection<CrmOrganization>('organizations');
  const interactions = useCollection<Interaction>('interactions');
  const query = useQueryState();
  const q = query.get('q');
  const status = query.get('status');
  const org = query.get('org');
  const tag = query.get('tag');
  const orgName = (id?: string) => organizations.find((o) => o.id === id)?.name;
  const last = (id: string) => sortByDate(interactions.filter((i) => i.contactId === id))[0]?.at;
  const tags = [...new Set(contacts.flatMap((c) => c.tags))].sort();
  const rows = contacts
    .filter((c) => (!status || c.status === status) && (!org || (org === 'none' ? !c.organizationId : c.organizationId === org)) && (!tag || c.tags.includes(tag)) && (!q || matches(`${c.name} ${c.email} ${c.tags.join(' ')}`, q)))
    .sort((a, b) => Number(a.status === 'inactive') - Number(b.status === 'inactive') || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title={t('contactsTitle')}
        subtitle={t('contactsSubtitle')}
        actions={
          <span className="crm-head-actions">
            <DemoBadge />
            {canEdit && (
              <Link className="bo-btn small" to="/contacts/new">
                {t('newContact')}
              </Link>
            )}
          </span>
        }
      />
      {!canEdit && <ViewOnly />}
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: contacts.length })}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchContacts')} />
        <FilterSelect label={t('filterStatus')} value={status} onChange={(v) => query.set('status', v)} options={[{ value: '', label: '—' }, { value: 'active', label: t('statusActive') }, { value: 'inactive', label: t('statusInactive') }]} />
        <FilterSelect label={t('filterOrganization')} value={org} onChange={(v) => query.set('org', v)} options={[{ value: '', label: '—' }, { value: 'none', label: t('noOrganization') }, ...organizations.map((o) => ({ value: o.id, label: o.name }))]} />
        <FilterSelect label={t('filterTag')} value={tag} onChange={(v) => query.set('tag', v)} options={[{ value: '', label: '—' }, ...tags.map((x) => ({ value: x, label: x }))]} />
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
                <th>{t('colOrganization')}</th>
                <th>{t('colEmail')}</th>
                <th>{t('colTags')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colLastInteraction')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link className="bo-link" to={`/contacts/${c.id}`}>
                      {c.name}
                    </Link>
                    <span className="muted bo-sub">{l(c.position)}</span>
                  </td>
                  <td className="muted">
                    {c.organizationId ? (
                      <Link className="bo-link" to={`/organizations/${c.organizationId}`}>
                        {orgName(c.organizationId) ?? '—'}
                      </Link>
                    ) : (
                      t('noOrganization')
                    )}
                  </td>
                  <td className="muted">{c.email}</td>
                  <td className="muted">{c.tags.join(', ') || '—'}</td>
                  <td>
                    <ContactStatusBadge status={c.status} />
                  </td>
                  <td className="muted nowrap">{date(last(c.id))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function ContactDetailPage() {
  const { id = '' } = useParams();
  const { t, l, date } = useCrm();
  const actions = useCrmActions();
  const now = useNow();
  const canEdit = useCan('crm.contacts.edit');
  const canLog = useCan('crm.activity.edit');
  const contacts = useCollection<CrmContact>('contacts');
  const organizations = useCollection<CrmOrganization>('organizations');
  const interactions = useCollection<Interaction>('interactions');
  const events = useCollection<ActivityEvent>('activity');
  const [form, setForm] = useState<InteractionKind | null>(null);
  const [saved, setSaved] = useState(false);
  const contact = contacts.find((c) => c.id === id);
  const back = <BackLink to="/contacts" label={t('backToContacts')} />;
  if (!contact) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('contactNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const org = organizations.find((o) => o.id === contact.organizationId);
  const details: [string, ReactNode][] = [
    [t('fieldEmail'), contact.email],
    [t('fieldPhone'), contact.phone || '—'],
    [t('fieldOrganization'), org ? <Link key="o" className="bo-link" to={`/organizations/${org.id}`}>{org.name}</Link> : t('noOrganization')],
    [t('fieldTags'), contact.tags.join(', ') || '—'],
    [t('fieldStatus'), <ContactStatusBadge key="s" status={contact.status} />],
    [t('fieldCreated'), date(contact.createdAt)],
    ...(contact.updatedAt ? ([[t('fieldUpdated'), date(contact.updatedAt)]] as [string, ReactNode][]) : []),
  ];
  const open = (kind: InteractionKind) => {
    setForm(kind);
    setSaved(false);
  };

  return (
    <>
      {back}
      <PageHeader
        title={contact.name}
        subtitle={`${l(contact.position)} · ${org?.name ?? t('noOrganization')}`}
        actions={
          <span className="crm-head-actions">
            <ContactStatusBadge status={contact.status} />
            <DemoBadge />
            {canEdit && (
              <Link className="bo-btn small ghost" to={`/contacts/${contact.id}/edit`}>
                {t('edit')}
              </Link>
            )}
          </span>
        }
      />
      <div className="bo-detail-grid">
        <section className="bo-card" aria-label={t('contactInfo')}>
          <h2>{t('contactInfo')}</h2>
          <DetailList items={details} />
        </section>
        <section className="bo-card" aria-label={t('timelineTitle')} style={{ minWidth: 0 }}>
          <h2>{t('timelineTitle')}</h2>
          {canLog ? (
            <div className="bo-actions">
              <button type="button" className="bo-btn small" onClick={() => open('meeting')}>
                {t('logInteraction')}
              </button>
              <button type="button" className="bo-btn small ghost" onClick={() => open('note')}>
                {t('addNote')}
              </button>
            </div>
          ) : (
            <ViewOnly />
          )}
          {saved && <output className="bo-saved">{t('savedNotice')}</output>}
          {form && (
            <InteractionForm
              key={form}
              kind={form}
              contactId={contact.id}
              organizationId={contact.organizationId}
              onClose={(ok) => {
                setForm(null);
                setSaved(ok);
              }}
            />
          )}
          <Timeline items={sortByDate(interactions.filter((i) => i.contactId === contact.id))} contacts={contacts} organizations={organizations} now={now} canEdit={canLog} onDone={(i) => void actions.completeFollowUp(i)} showTargets={false} />
          <PermissionNote />
        </section>
      </div>
      <section className="bo-section" aria-label={t('changeHistory')}>
        <h2>{t('changeHistory')}</h2>
        <AuditTable events={events.filter((e) => e.entity.type === 'contact' && e.entity.id === contact.id)} />
      </section>
    </>
  );
}

/** Create (/contacts/new) or edit (/contacts/:id/edit) a fictional contact; permission crm.contacts.edit. */
export function ContactFormPage() {
  const { id } = useParams();
  const { t, fieldError, resultError } = useCrm();
  const navigate = useNavigate();
  const actions = useCrmActions();
  const contacts = useCollection<CrmContact>('contacts');
  const organizations = useCollection<CrmOrganization>('organizations');
  const existing = id ? contacts.find((c) => c.id === id) : undefined;
  const [input, setInput] = useState<ContactInput>(() => contactInput(existing));
  const [fields, setFields] = useState<FieldErrors<ContactField>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const back = id ? <BackLink to={`/contacts/${id}`} label={existing?.name ?? t('backToContacts')} /> : <BackLink to="/contacts" label={t('backToContacts')} />;
  if (id && !existing) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('contactNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const set = (key: ContactField) => (value: string) => {
    setInput((s) => ({ ...s, [key]: value }));
    setFields((f) => ({ ...f, [key]: undefined }));
  };
  const submit = async () => {
    setBusy(true);
    const out = id ? await actions.updateContact(id, input) : await actions.createContact(input);
    setBusy(false);
    if (out.ok) return navigate(`/contacts/${out.id}`);
    setError(resultError(out));
    if (out.error === 'invalid') setFields(out.fields);
  };

  return (
    <>
      {back}
      <PageHeader title={id ? t('editContact') : t('newContact')} subtitle={existing?.name} actions={<DemoBadge />} />
      <form
        className="bo-card crm-form"
        aria-label={id ? t('editContact') : t('newContact')}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void submit();
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <PermissionNote icon="science" text={t('demoDataHint')} />
        </div>
        <div className="crm-form-grid">
          <TextField label={t('fieldName')} required value={input.name} onChange={set('name')} error={fieldError(fields.name)} />
          <SelectField label={t('fieldStatus')} value={input.status} onChange={set('status')} options={[{ value: 'active', label: t('statusActive') }, { value: 'inactive', label: t('statusInactive') }]} />
          <TextField label={t('fieldPositionRu')} required value={input.positionRu} onChange={set('positionRu')} error={fieldError(fields.positionRu)} />
          <TextField label={t('fieldPositionEn')} value={input.positionEn} onChange={set('positionEn')} hint={t('fieldPositionEnHint')} />
          <TextField label={t('fieldEmail')} type="email" required value={input.email} onChange={set('email')} error={fieldError(fields.email)} placeholder="name@example.kg" />
          <TextField label={t('fieldPhone')} type="tel" value={input.phone} onChange={set('phone')} error={fieldError(fields.phone)} placeholder="+996 555 000 0xx" />
          <SelectField
            label={t('fieldOrganization')}
            value={input.organizationId}
            onChange={set('organizationId')}
            error={fieldError(fields.organizationId)}
            options={[{ value: '', label: t('noOrganization') }, ...[...organizations].sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ value: o.id, label: o.name }))]}
          />
          <TextField label={t('fieldTags')} value={input.tags} onChange={set('tags')} hint={t('fieldTagsHint')} />
        </div>
        {error && (
          <p className="bo-field-error" role="alert">
            {error}
          </p>
        )}
        <div className="crm-form-actions">
          <button type="submit" className="bo-btn" disabled={busy} aria-busy={busy}>
            {t('save')}
          </button>
          <button type="button" className="bo-btn ghost" disabled={busy} onClick={() => navigate(id ? `/contacts/${id}` : '/contacts')}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </>
  );
}
