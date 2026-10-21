import { Link } from 'react-router';

import { useBackoffice, useCollection } from '@mmusic/backoffice/react';
import { DemoBadge, EmptyState, FilterBar, FilterSelect, PageHeader, PermissionNote, SearchField } from '@mmusic/backoffice/ui';

import { useCrmCan, usePipeline, usePreferences } from '@/access';
import { useCrmActions } from '@/data/actions';
import { dealTotals } from '@/domain/analytics';
import { dealOutcome, nextStage } from '@/domain/pipeline';
import type { Deal, DealStage } from '@/domain/types';
import { fill } from '@/strings';
import { DealStageBadge, matches, useCounterparty, useCrm, useQueryState, ViewOnly } from '@/ui';

const SORTS = ['updated', 'value', 'close', 'title'] as const;
type Sort = (typeof SORTS)[number];

function sortDeals(deals: Deal[], sort: Sort): Deal[] {
  const changed = (d: Deal) => d.updatedAt ?? d.stageChangedAt;
  return [...deals].sort((a, b) =>
    sort === 'value'
      ? (b.estimatedValueKgs ?? -1) - (a.estimatedValueKgs ?? -1)
      : sort === 'close'
        ? (a.expectedCloseAt ?? '9999').localeCompare(b.expectedCloseAt ?? '9999')
        : sort === 'title'
          ? a.title.localeCompare(b.title)
          : changed(b).localeCompare(changed(a)),
  );
}

/** Deals (M5): the demo partnership pipeline as a board (stages) or a list, with search, filters and sorting. */
export function DealsPage() {
  const { t, kgs, day, staffName } = useCrm();
  const bo = useBackoffice();
  const actions = useCrmActions();
  const canEdit = useCrmCan('crm.deals.edit');
  const deals = useCollection<Deal>('deals');
  const counterparty = useCounterparty();
  const query = useQueryState();
  const pipeline = usePipeline();
  const prefs = usePreferences();
  const view = query.get('view') === 'list' || query.get('view') === 'board' ? (query.get('view') as 'list' | 'board') : prefs.dealsView;
  const q = query.get('q');
  const stage = query.get('stage');
  const outcome = query.get('outcome');
  const owner = query.get('owner');
  const sort = (SORTS as readonly string[]).includes(query.get('sort')) ? (query.get('sort') as Sort) : 'updated';
  const orgName = (d: Deal) => counterparty(d)?.name ?? '—';
  const rows = sortDeals(
    deals.filter((d) => (!stage || d.stage === stage) && (!outcome || dealOutcome(d.stage) === outcome) && (!owner || d.ownerId === owner) && (!q || matches(`${d.title} ${orgName(d)}`, q))),
    sort,
  );
  const totals = dealTotals(rows);
  const staff = bo.staff.filter((s) => s.app === 'crm');
  const estimate = (d: Deal) => (d.estimatedValueKgs === undefined ? t('noEstimate') : kgs(d.estimatedValueKgs));

  return (
    <>
      <PageHeader
        title={t('dealsTitle')}
        subtitle={t('dealsSubtitle')}
        actions={
          <span className="crm-head-actions">
            <DemoBadge />
            {canEdit && (
              <Link className="bo-btn small" to="/deals/new">
                {t('newDeal')}
              </Link>
            )}
          </span>
        }
      />
      {!canEdit && <ViewOnly />}
      <nav className="bo-tabs" aria-label={t('dealsTitle')}>
        {(['board', 'list'] as const).map((v) => (
          <button key={v} type="button" className={v === view ? 'bo-tab active' : 'bo-tab'} style={{ border: 0, cursor: 'pointer', background: v === view ? undefined : 'none' }} aria-pressed={v === view} onClick={() => query.set('view', v)}>
            {v === 'board' ? t('viewBoard') : t('viewList')}
          </button>
        ))}
      </nav>
      <FilterBar summary={`${fill(t('shown'), { n: rows.length, total: deals.length })} · ${fill(t('pipelineTotals'), { open: totals.open, won: totals.won, lost: totals.lost })}`}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchDeals')} />
        {view === 'list' && <FilterSelect label={t('filterStage')} value={stage} onChange={(v) => query.set('stage', v)} options={[{ value: '', label: '—' }, ...pipeline.boardIds.map((s) => ({ value: s, label: pipeline.label(s) }))]} />}
        <FilterSelect label={t('filterOutcome')} value={outcome} onChange={(v) => query.set('outcome', v)} options={[{ value: '', label: '—' }, { value: 'open', label: t('outcomeOpen') }, { value: 'won', label: t('stageWon') }, { value: 'lost', label: t('stageLost') }]} />
        <FilterSelect label={t('filterOwner')} value={owner} onChange={(v) => query.set('owner', v)} options={[{ value: '', label: '—' }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} />
        <FilterSelect label={t('sortBy')} value={sort} onChange={(v) => query.set('sort', v === 'updated' ? '' : v)} options={[{ value: 'updated', label: t('sortUpdated') }, { value: 'value', label: t('sortValue') }, { value: 'close', label: t('sortClose') }, { value: 'title', label: t('sortTitle') }]} />
      </FilterBar>
      <div style={{ marginBottom: 12 }}>
        <PermissionNote icon="science" text={`${fill(t('openEstimateLine'), { sum: kgs(totals.openEstimateKgs) })}. ${t('fieldEstimateHint')}`} />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="search-off" title={deals.length === 0 ? t('noDeals') : t('emptyFiltered')} body={t('emptyFilteredHint')}>
          <button type="button" className="bo-btn ghost" onClick={query.clear}>
            {t('clearFilters')}
          </button>
        </EmptyState>
      ) : view === 'board' ? (
        <div className="crm-board">
          {[...pipeline.boardIds, ...[...new Set(rows.map((d) => d.stage))].filter((s) => !pipeline.boardIds.includes(s))].map((s: DealStage) => {
            const items = rows.filter((d) => d.stage === s);
            const sum = items.reduce((acc, d) => acc + (d.estimatedValueKgs ?? 0), 0);
            return (
              <section key={s} className={`crm-column ${dealOutcome(s)}`} aria-label={pipeline.label(s)} data-stage={s}>
                <header>
                  <DealStageBadge stage={s} />
                  <span className="bo-muted">
                    {items.length}
                    {sum > 0 ? ` · ${kgs(sum)}` : ''}
                  </span>
                </header>
                {items.length === 0 ? (
                  <p className="bo-muted crm-column-empty">{t('boardEmpty')}</p>
                ) : (
                  items.map((d) => {
                    const next = nextStage(d.stage, pipeline.openIds);
                    return (
                      <article key={d.id} className="crm-deal-card" data-deal={d.id}>
                        <Link className="bo-link" to={`/deals/${d.id}`}>
                          {d.title}
                        </Link>
                        <span className="bo-muted">{orgName(d)}</span>
                        <span className="crm-deal-meta">
                          <span>{estimate(d)}</span>
                          <span className="bo-muted">{staffName(d.ownerId)}</span>
                        </span>
                        {canEdit && next && (
                          <button type="button" className="bo-btn ghost small" onClick={() => void actions.moveDeal(d.id, next)}>
                            → {pipeline.label(next)}
                          </button>
                        )}
                      </article>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th>{t('colDeal')}</th>
                <th>{t('counterparty')}</th>
                <th>{t('colStage')}</th>
                <th>{t('colOwner')}</th>
                <th style={{ textAlign: 'right' }}>{t('colEstimate')}</th>
                <th>{t('colExpectedClose')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link className="bo-link" to={`/deals/${d.id}`}>
                      {d.title}
                    </Link>
                  </td>
                  <td className="muted">
                    {counterparty(d) ? (
                      <Link className="bo-link" to={counterparty(d)!.path}>
                        {orgName(d)}
                      </Link>
                    ) : (
                      '—'
                    )}
                    {(d.secondaryOrganizationId || d.secondaryArtistId) && (
                      <span className="muted bo-sub">+ {counterparty({ organizationId: d.secondaryOrganizationId, artistId: d.secondaryArtistId })?.name ?? '—'}</span>
                    )}
                  </td>
                  <td>
                    <DealStageBadge stage={d.stage} />
                  </td>
                  <td className="muted">{staffName(d.ownerId)}</td>
                  <td className="muted nowrap" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {estimate(d)}
                  </td>
                  <td className="muted nowrap">{d.expectedCloseAt ? day(d.expectedCloseAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
