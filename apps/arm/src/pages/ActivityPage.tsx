import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { useBackoffice, useCollection } from '@mmusic/backoffice/react';
import { DemoBadge, EmptyState, FilterBar, FilterSelect, PageHeader, SearchField } from '@mmusic/backoffice/ui';

import { fill } from '@/strings';
import { actionVerb, EventTable, matches, useArm, useQueryState } from '@/ui';

/** The audit log: every decision and administrative action, searchable and filterable (filters kept in the URL). */
export function ActivityPage() {
  const { t, l, staffName, entityLabel } = useArm();
  const bo = useBackoffice();
  const events = useCollection<ActivityEvent>('activity');
  const query = useQueryState();
  const q = query.get('q');
  const entity = query.get('entity');
  const action = query.get('action');
  const role = query.get('role');
  const rows = events.filter(
    (e) =>
      (!entity || e.entity.type === entity) &&
      (!action || actionVerb(e.action) === action) &&
      (!role || e.actorRoleId === role) &&
      (!q || matches(`${entityLabel(e)} ${staffName(e.actorId)} ${e.reason ?? ''}`, q)),
  );

  return (
    <>
      <PageHeader title={t('activityTitle')} subtitle={t('activitySubtitle')} actions={<DemoBadge />} />
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: events.length })}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchActivity')} />
        <FilterSelect
          label={t('filterEntity')}
          value={entity}
          onChange={(v) => query.set('entity', v)}
          options={[
            { value: '', label: '—' },
            { value: 'track', label: t('kindTrack') },
            { value: 'release', label: t('kindRelease') },
            { value: 'artist', label: t('kindArtist') },
            { value: 'user', label: t('kindUser') },
            { value: 'campaign', label: t('kindCampaign') },
            { value: 'role', label: t('kindRole') },
            { value: 'staff', label: t('kindStaff') },
            { value: 'setting', label: t('kindSetting') },
          ]}
        />
        <FilterSelect
          label={t('filterAction')}
          value={action}
          onChange={(v) => query.set('action', v)}
          options={[
            { value: '', label: '—' },
            { value: 'approve', label: t('actionApprove') },
            { value: 'request-changes', label: t('actionRequestChanges') },
            { value: 'reject', label: t('actionReject') },
            { value: 'suspend', label: t('actionSuspend') },
            { value: 'reactivate', label: t('actionReactivate') },
            { value: 'unlist', label: t('actionUnlist') },
            { value: 'relist', label: t('actionRelist') },
            { value: 'grant', label: t('actionGrant') },
            { value: 'revoke', label: t('actionRevoke') },
            { value: 'reset', label: t('actionReset') },
            { value: 'role', label: t('actionStaffRole') },
            { value: 'preferences', label: t('actionPreferences') },
          ]}
        />
        <FilterSelect label={t('filterActorRole')} value={role} onChange={(v) => query.set('role', v)} options={[{ value: '', label: '—' }, ...bo.roles.map((r) => ({ value: r.id, label: l(r.label) }))]} />
      </FilterBar>
      {events.length === 0 ? (
        <EmptyState icon="history" title={t('noActivity')} />
      ) : rows.length === 0 ? (
        <EmptyState icon="search-off" title={t('emptyFiltered')} body={t('emptyFilteredHint')}>
          <button type="button" className="bo-btn ghost" onClick={query.clear}>
            {t('clearFilters')}
          </button>
        </EmptyState>
      ) : (
        <EventTable events={rows} />
      )}
    </>
  );
}
