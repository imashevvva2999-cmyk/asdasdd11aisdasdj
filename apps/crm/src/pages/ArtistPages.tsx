import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useCollection } from '@mmusic/backoffice/react';
import { BackLink, ConfirmDialog, DemoBadge, DetailList, EmptyState, FilterBar, FilterSelect, PageHeader, PermissionNote, SearchField } from '@mmusic/backoffice/ui';

import { useCrmCan } from '@/access';
import { InteractionForm } from '@/components/InteractionForm';
import { useCrmActions } from '@/data/actions';
import { groupsOf } from '@/domain/artists';
import { sortByDate } from '@/domain/rules';
import { RELATIONSHIP_STATUSES, type CrmArtist, type CrmContact, type CrmOrganization, type Deal, type Interaction, type RelationshipStatus, type Task } from '@/domain/types';
import { COLLABORATION_LABELS, fill } from '@/strings';
import { ArtistAvatar, AuditTable, CollaborationBadge, DealStageBadge, KindBadge, matches, SelectField, TaskStatusBadge, Timeline, useCrm, useNow, useQueryState, ViewOnly } from '@/ui';

/** Solo artists (unified CRM): search, genre, collaboration and group-membership filters kept in the URL. */
export function ArtistsPage() {
  const { t, l, date } = useCrm();
  const canEdit = useCrmCan('crm.artists.edit');
  const artists = useCollection<CrmArtist>('artists');
  const organizations = useCollection<CrmOrganization>('organizations');
  const contacts = useCollection<CrmContact>('contacts');
  const interactions = useCollection<Interaction>('interactions');
  const query = useQueryState();
  const q = query.get('q');
  const genre = query.get('genre');
  const collab = query.get('collab');
  const member = query.get('member');
  const genres = [...new Set(artists.flatMap((a) => a.genres))].sort((a, b) => a.localeCompare(b));
  const rows = artists
    .filter((a) => {
      const inGroup = groupsOf(a.id, organizations).length > 0;
      return (!genre || a.genres.includes(genre)) && (!collab || a.collaboration === collab) && (!member || (member === 'group') === inGroup) && (!q || matches(`${a.stageName} ${a.genres.join(' ')} ${a.city}`, q));
    })
    .sort((a, b) => RELATIONSHIP_STATUSES.indexOf(b.collaboration) - RELATIONSHIP_STATUSES.indexOf(a.collaboration) || a.stageName.localeCompare(b.stageName));
  const last = (id: string) => sortByDate(interactions.filter((i) => i.artistId === id))[0]?.at;

  return (
    <>
      <PageHeader
        title={t('artistsTitle')}
        subtitle={t('artistsSubtitle')}
        actions={
          <span className="crm-head-actions">
            <DemoBadge />
            {canEdit && (
              <Link className="bo-btn small" to="/artists/new">
                {t('newArtist')}
              </Link>
            )}
          </span>
        }
      />
      {!canEdit && <ViewOnly />}
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: artists.length })}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchArtists')} />
        <FilterSelect label={t('filterGenre')} value={genre} onChange={(v) => query.set('genre', v)} options={[{ value: '', label: '—' }, ...genres.map((g) => ({ value: g, label: g }))]} />
        <FilterSelect label={t('filterCollaboration')} value={collab} onChange={(v) => query.set('collab', v)} options={[{ value: '', label: '—' }, ...RELATIONSHIP_STATUSES.map((s) => ({ value: s, label: l(COLLABORATION_LABELS[s]) }))]} />
        <FilterSelect label={t('filterMembership')} value={member} onChange={(v) => query.set('member', v)} options={[{ value: '', label: '—' }, { value: 'solo', label: t('membershipSolo') }, { value: 'group', label: t('membershipGroup') }]} />
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
                <th>{t('colArtist')}</th>
                <th>{t('colGenres')}</th>
                <th>{t('colCity')}</th>
                <th>{t('colManager')}</th>
                <th>{t('colGroups')}</th>
                <th>{t('colCollaboration')}</th>
                <th>{t('colLastInteraction')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} data-artist={a.id}>
                  <td>
                    <span className="crm-name-cell">
                      <ArtistAvatar artist={a} size={32} />
                      <Link className="bo-link" to={`/artists/${a.id}`}>
                        {a.stageName}
                      </Link>
                    </span>
                  </td>
                  <td className="muted">{a.genres.join(', ')}</td>
                  <td className="muted">{a.city}</td>
                  <td className="muted">{contacts.find((c) => c.id === a.managerContactId)?.name ?? '—'}</td>
                  <td className="muted">{groupsOf(a.id, organizations).map((g) => g.name).join(', ') || '—'}</td>
                  <td>
                    <CollaborationBadge status={a.collaboration} />
                  </td>
                  <td className="muted nowrap">{date(last(a.id))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** One artist: details, collaboration status, groups (with roles), linked deals and tasks, interactions, change log. */
export function ArtistDetailPage() {
  const { id = '' } = useParams();
  const { t, l, date, day, resultError } = useCrm();
  const actions = useCrmActions();
  const now = useNow();
  const canEdit = useCrmCan('crm.artists.edit');
  const canPartners = useCrmCan('crm.partners.edit');
  const canLog = useCrmCan('crm.activity.edit');
  const canDeals = useCrmCan('crm.deals.view');
  const canNewDeal = useCrmCan('crm.deals.edit');
  const canTasks = useCrmCan('crm.tasks.view');
  const canNewTask = useCrmCan('crm.tasks.edit');
  const canActivity = useCrmCan('crm.activity.view');
  const artists = useCollection<CrmArtist>('artists');
  const organizations = useCollection<CrmOrganization>('organizations');
  const contacts = useCollection<CrmContact>('contacts');
  const deals = useCollection<Deal>('deals');
  const tasks = useCollection<Task>('tasks');
  const interactions = useCollection<Interaction>('interactions');
  const events = useCollection<ActivityEvent>('activity');
  const [to, setTo] = useState<RelationshipStatus | ''>('');
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState(false);
  const [logging, setLogging] = useState(false);
  const artist = artists.find((a) => a.id === id);
  const back = <BackLink to="/artists" label={t('backToArtists')} />;
  if (!artist) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('artistNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const manager = contacts.find((c) => c.id === artist.managerContactId);
  const groups = groupsOf(artist.id, organizations);
  // Deals where the artist is the primary counterparty or the secondary participant (one deal record either way).
  const ownDeals = deals.filter((d) => d.artistId === artist.id || d.secondaryArtistId === artist.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ownTasks = tasks.filter((x) => x.artistId === artist.id).sort((a, b) => (a.dueAt ?? '~').localeCompare(b.dueAt ?? '~'));
  const details: [string, ReactNode][] = [
    [t('fieldStageName'), artist.stageName],
    [t('fieldLegalName'), artist.legalName || t('notSpecified')],
    [t('fieldGenres'), artist.genres.join(', ')],
    [t('fieldCity'), artist.city],
    [t('fieldArtistEmail'), artist.email || '—'],
    [t('fieldArtistPhone'), artist.phone || '—'],
    [t('fieldManager'), manager ? <Link key="m" className="bo-link" to={`/contacts/${manager.id}`}>{manager.name}</Link> : '—'],
    [t('fieldNotes'), artist.notes || '—'],
    [t('fieldCollaboration'), <CollaborationBadge key="c" status={artist.collaboration} />],
    ...(artist.collaborationChangedAt ? ([[t('fieldCollaborationChanged'), date(artist.collaborationChangedAt)]] as [string, ReactNode][]) : []),
    [t('fieldCreated'), date(artist.createdAt)],
    ...(artist.updatedAt ? ([[t('fieldUpdated'), date(artist.updatedAt)]] as [string, ReactNode][]) : []),
  ];
  const confirm = async () => {
    if (!to) return;
    setBusy(true);
    const out = await actions.changeCollaboration(artist.id, to, note);
    setBusy(false);
    if (!out.ok) return setError(resultError(out));
    setConfirming(false);
    setTo('');
    setNotice(true);
  };

  return (
    <>
      {back}
      <PageHeader
        title={artist.stageName}
        subtitle={`${t('entitySolo')} · ${artist.genres.join(', ')} · ${artist.city}`}
        actions={
          <span className="crm-head-actions">
            <KindBadge kind="solo" />
            <CollaborationBadge status={artist.collaboration} />
            <DemoBadge />
            {canEdit && (
              <Link className="bo-btn small ghost" to={`/artists/${artist.id}/edit`}>
                {t('edit')}
              </Link>
            )}
          </span>
        }
      />
      <div className="bo-detail-grid">
        <section className="bo-card" aria-labelledby="artist-details">
          <div className="crm-name-cell" style={{ marginBottom: 12 }}>
            <ArtistAvatar artist={artist} size={56} />
            <h2 id="artist-details" style={{ margin: 0 }}>
              {t('detailsTitle')}
            </h2>
          </div>
          <DetailList items={details} />
        </section>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <section className="bo-card" aria-labelledby="artist-collab">
            <h2 id="artist-collab">{t('collaborationTitle')}</h2>
            <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
              {t('collaborationHint')}
            </p>
            {canPartners ? (
              <div className="crm-form-grid" style={{ alignItems: 'end' }}>
                <SelectField label={t('collaborationTo')} value={to} onChange={(v) => setTo(v as RelationshipStatus | '')} options={[{ value: '', label: '—' }, ...RELATIONSHIP_STATUSES.filter((s) => s !== artist.collaboration).map((s) => ({ value: s, label: l(COLLABORATION_LABELS[s]) }))]} />
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
                    {t('changeCollaboration')}
                  </button>
                </div>
              </div>
            ) : (
              <ViewOnly />
            )}
            {notice && <output className="bo-saved">{t('savedNotice')}</output>}
            <PermissionNote />
          </section>
          <section className="bo-card" aria-labelledby="artist-groups">
            <h2 id="artist-groups">{t('groupsTitle')}</h2>
            {groups.length === 0 ? (
              <p className="bo-muted">{t('noGroups')}</p>
            ) : (
              <ul className="bo-list">
                {groups.map((g) => (
                  <li key={g.id} data-group={g.id}>
                    <span className="grow">
                      <Link className="bo-link bo-ellipsis" to={`/organizations/${g.id}`}>
                        {g.name}
                      </Link>
                      <span className="bo-muted bo-ellipsis" style={{ fontSize: 13 }}>
                        {fill(t('roleInGroup'), { role: g.members?.find((m) => m.artistId === artist.id)?.role ?? '—' })}
                      </span>
                    </span>
                    <KindBadge kind="group" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {(canDeals || canTasks) && (
        <div className="crm-columns bo-section">
          {canDeals && (
            <section className="bo-card" aria-labelledby="artist-deals">
              <div className="bo-card-head">
                <h2 id="artist-deals" style={{ margin: 0 }}>
                  {t('linkedDeals')}
                </h2>
                {canNewDeal && (
                  <Link className="bo-btn small ghost" to={`/deals/new?artistId=${artist.id}`}>
                    {t('newDealAction')}
                  </Link>
                )}
              </div>
              {ownDeals.length === 0 ? (
                <p className="bo-muted">{t('noLinkedDeals')}</p>
              ) : (
                <ul className="bo-list">
                  {ownDeals.map((d) => (
                    <li key={d.id}>
                      <span className="grow">
                        <Link className="bo-link bo-ellipsis" to={`/deals/${d.id}`}>
                          {d.title}
                        </Link>
                        {d.secondaryArtistId === artist.id && (
                          <span className="bo-muted" style={{ fontSize: 13 }}>
                            {t('secondaryRole')}
                          </span>
                        )}
                      </span>
                      <DealStageBadge stage={d.stage} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {canTasks && (
            <section className="bo-card" aria-labelledby="artist-tasks">
              <div className="bo-card-head">
                <h2 id="artist-tasks" style={{ margin: 0 }}>
                  {t('linkedTasks')}
                </h2>
                {canNewTask && (
                  <Link className="bo-btn small ghost" to={`/tasks/new?artistId=${artist.id}`}>
                    {t('newTaskAction')}
                  </Link>
                )}
              </div>
              {ownTasks.length === 0 ? (
                <p className="bo-muted">{t('noLinkedTasks')}</p>
              ) : (
                <ul className="bo-list">
                  {ownTasks.map((x) => (
                    <li key={x.id}>
                      <span className="grow">
                        <Link className="bo-link bo-ellipsis" to={`/tasks/${x.id}`}>
                          {x.title}
                        </Link>
                        <span className="bo-muted" style={{ fontSize: 13 }}>
                          {day(x.dueAt)}
                        </span>
                      </span>
                      <TaskStatusBadge status={x.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {canActivity && (
        <section className="bo-card bo-section" aria-labelledby="artist-timeline">
          <h2 id="artist-timeline">{t('timelineTitle')}</h2>
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
          {logging && <InteractionForm artistId={artist.id} contactId={artist.managerContactId ?? ''} onClose={() => setLogging(false)} />}
          <Timeline items={sortByDate(interactions.filter((i) => i.artistId === artist.id))} contacts={contacts} organizations={organizations} now={now} canEdit={canLog} onDone={(i) => void actions.completeFollowUp(i)} />
        </section>
      )}
      <section className="bo-section" aria-labelledby="artist-history">
        <h2 id="artist-history">{t('changeHistory')}</h2>
        <AuditTable events={events.filter((e) => e.entity.type === 'artist' && e.entity.id === artist.id)} />
      </section>
      <ConfirmDialog
        open={confirming}
        title={fill(t('confirmCollaboration'), { name: artist.stageName })}
        body={`${l(COLLABORATION_LABELS[artist.collaboration])} → ${to ? l(COLLABORATION_LABELS[to]) : ''}. ${t('confirmRelationshipBody')}`}
        confirmLabel={t('changeCollaboration')}
        reason={{ required: false, value: note, onChange: setNote }}
        busy={busy}
        error={error}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
