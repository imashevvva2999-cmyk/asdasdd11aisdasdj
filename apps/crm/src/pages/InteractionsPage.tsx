import { useState } from 'react';

import { useCollection } from '@mmusic/backoffice/react';
import { DemoBadge, EmptyState, FilterBar, FilterSelect, PageHeader, PermissionNote, SearchField } from '@mmusic/backoffice/ui';

import { useCrmCan } from '@/access';
import { InteractionForm } from '@/components/InteractionForm';
import { useCrmActions } from '@/data/actions';
import { sortByDate } from '@/domain/rules';
import { INTERACTION_KINDS, type CrmContact, type CrmOrganization, type Interaction } from '@/domain/types';
import { fill, INTERACTION_KIND_KEYS } from '@/strings';
import { matches, Timeline, useCrm, useNow, useQueryState, ViewOnly } from '@/ui';

/** All logged interactions as one chronological timeline: search, type, follow-up and author filters in the URL. */
export function InteractionsPage() {
  const { t, staffName } = useCrm();
  const actions = useCrmActions();
  const canLog = useCrmCan('crm.activity.edit');
  const interactions = useCollection<Interaction>('interactions');
  const contacts = useCollection<CrmContact>('contacts');
  const organizations = useCollection<CrmOrganization>('organizations');
  const query = useQueryState();
  const [logging, setLogging] = useState(false);
  const [saved, setSaved] = useState(false);
  const q = query.get('q');
  const kind = query.get('kind');
  const follow = query.get('follow');
  const author = query.get('author');
  const now = useNow();
  const text = (i: Interaction) => `${i.summary} ${contacts.find((c) => c.id === i.contactId)?.name ?? ''} ${organizations.find((o) => o.id === i.organizationId)?.name ?? ''}`;
  const rows = sortByDate(
    interactions.filter(
      (i) =>
        (!kind || i.kind === kind) &&
        (!author || i.authorId === author) &&
        (!follow || (follow === 'open' ? !!i.followUpAt && !i.followUpDone : !!i.followUpAt)) &&
        (!q || matches(text(i), q)),
    ),
  );
  const authors = [...new Set(interactions.map((i) => i.authorId))];

  return (
    <>
      <PageHeader
        title={t('interactionsTitle')}
        subtitle={t('interactionsSubtitle')}
        actions={
          <span className="crm-head-actions">
            <DemoBadge />
            {canLog && !logging && (
              <button
                type="button"
                className="bo-btn small"
                onClick={() => {
                  setLogging(true);
                  setSaved(false);
                }}
              >
                {t('logInteraction')}
              </button>
            )}
          </span>
        }
      />
      {!canLog && <ViewOnly />}
      {saved && <output className="bo-saved">{t('savedNotice')}</output>}
      {logging && (
        <InteractionForm
          onClose={(ok) => {
            setLogging(false);
            setSaved(ok);
          }}
        />
      )}
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: interactions.length })}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchInteractions')} />
        <FilterSelect label={t('filterInteractionKind')} value={kind} onChange={(v) => query.set('kind', v)} options={[{ value: '', label: '—' }, ...INTERACTION_KINDS.map((k) => ({ value: k, label: t(INTERACTION_KIND_KEYS[k]) }))]} />
        <FilterSelect label={t('filterFollowUp')} value={follow} onChange={(v) => query.set('follow', v)} options={[{ value: '', label: '—' }, { value: 'open', label: t('followUpOpen') }, { value: 'any', label: t('followUpAny') }]} />
        <FilterSelect label={t('colStaff')} value={author} onChange={(v) => query.set('author', v)} options={[{ value: '', label: '—' }, ...authors.map((a) => ({ value: a, label: staffName(a) }))]} />
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState icon="search-off" title={t('emptyFiltered')} body={t('emptyFilteredHint')}>
          <button type="button" className="bo-btn ghost" onClick={query.clear}>
            {t('clearFilters')}
          </button>
        </EmptyState>
      ) : (
        <section className="bo-card" aria-label={t('interactionsTitle')}>
          <Timeline items={rows} contacts={contacts} organizations={organizations} now={now} canEdit={canLog} onDone={(i) => void actions.completeFollowUp(i)} />
        </section>
      )}
      <div style={{ marginTop: 16 }}>
        <PermissionNote />
      </div>
    </>
  );
}
