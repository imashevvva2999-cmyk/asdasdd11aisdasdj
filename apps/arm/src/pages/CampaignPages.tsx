import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { formatNumber } from '@mmusic/backoffice/i18n';
import { useCollection } from '@mmusic/backoffice/react';
import { REVIEW_STATUS_LABELS, REVIEW_STATUSES } from '@mmusic/backoffice/review';
import { BackLink, DemoBadge, DetailList, EmptyState, FilterBar, FilterSelect, PageHeader, PermissionNote, SearchField } from '@mmusic/backoffice/ui';
import { PROMO_TOOLS } from '@mmusic/core/mocks/promotions';

import { useArmCan, useArmPreferences } from '@/access';
import { useArmActions } from '@/data/actions';
import type { Campaign, DemoArtist, PromoToolId, Submission } from '@/domain/types';
import { isListed, sortQueue } from '@/domain/workflow';
import { fill } from '@/strings';
import { DecisionPanel, EventTable, ListingBadge, matches, ReviewBadge, useArm, useDefaultFilter, useQueryState } from '@/ui';

/** Tool names as the app shows them to artists (core/mocks/promotions.ts). */
function useToolName() {
  const { l } = useArm();
  return (id: PromoToolId) => {
    const tool = PROMO_TOOLS.find((x) => x.id === id);
    return tool ? l(tool.name) : id;
  };
}

function useCampaignFormat() {
  const { t, locale } = useArm();
  const day = (iso: string) => new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  return {
    day,
    budget: (c: Campaign) => (c.requestedBudgetKgs === undefined ? t('budgetSlots') : fill(t('kgs'), { n: formatNumber(c.requestedBudgetKgs, locale) })),
  };
}

/** Campaign requests of fictional demo artists "in review": search, status and tool filters kept in the URL. */
export function CampaignsPage() {
  const { t, l, date } = useArm();
  const toolName = useToolName();
  const { day, budget } = useCampaignFormat();
  const campaigns = useCollection<Campaign>('campaigns');
  const subs = useCollection<Submission>('submissions');
  const artists = useCollection<DemoArtist>('artists');
  useDefaultFilter('status', useArmPreferences().campaignStatus);
  const query = useQueryState();
  const q = query.get('q');
  const status = query.get('status');
  const tool = query.get('tool');
  const title = (c: Campaign) => subs.find((s) => s.id === c.submissionId)?.title ?? '—';
  const artistName = (id: string) => artists.find((a) => a.id === id)?.name ?? '—';
  const rows = sortQueue(campaigns.filter((c) => (!status || c.status === status) && (!tool || c.toolId === tool) && (!q || matches(`${title(c)} ${artistName(c.artistId)}`, q))));

  return (
    <>
      <PageHeader title={t('campaignsTitle')} subtitle={t('campaignsSubtitle')} actions={<DemoBadge />} />
      <FilterBar summary={fill(t('shown'), { n: rows.length, total: campaigns.length })}>
        <SearchField value={q} onChange={(v) => query.set('q', v)} placeholder={t('searchCampaigns')} />
        <FilterSelect label={t('filterStatus')} value={status} onChange={(v) => query.set('status', v)} options={[{ value: '', label: '—' }, ...REVIEW_STATUSES.map((s) => ({ value: s, label: l(REVIEW_STATUS_LABELS[s]) }))]} />
        <FilterSelect label={t('filterTool')} value={tool} onChange={(v) => query.set('tool', v)} options={[{ value: '', label: '—' }, ...PROMO_TOOLS.map((x) => ({ value: x.id, label: l(x.name) }))]} />
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
                <th>{t('colPromoted')}</th>
                <th>{t('colArtist')}</th>
                <th>{t('colTool')}</th>
                <th>{t('colBudget')}</th>
                <th>{t('colStart')}</th>
                <th>{t('colSubmitted')}</th>
                <th>{t('colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link className="bo-link" to={`/campaigns/${c.id}`}>
                      {title(c)}
                    </Link>
                  </td>
                  <td className="muted">{artistName(c.artistId)}</td>
                  <td className="muted">{toolName(c.toolId)}</td>
                  <td className="muted nowrap">{budget(c)}</td>
                  <td className="muted nowrap">{day(c.startsAt)}</td>
                  <td className="muted nowrap">{date(c.submittedAt)}</td>
                  <td>
                    <ReviewBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** One campaign request: what it promotes, the review decision (super admin by the provisional matrix) and history. */
export function CampaignDetailPage() {
  const { id = '' } = useParams();
  const { t, l, date, staffName } = useArm();
  const toolName = useToolName();
  const { day, budget } = useCampaignFormat();
  const actions = useArmActions();
  const canModeration = useArmCan('arm.moderation.view');
  const canArtists = useArmCan('arm.artists.view');
  const campaign = useCollection<Campaign>('campaigns').find((c) => c.id === id);
  const subs = useCollection<Submission>('submissions');
  const artists = useCollection<DemoArtist>('artists');
  const events = useCollection<ActivityEvent>('activity');
  const back = <BackLink to="/campaigns" label={t('backToCampaigns')} />;

  if (!campaign) {
    return (
      <>
        {back}
        <EmptyState icon="search-off" title={t('campaignNotFound')} body={t('notFoundHint')} />
      </>
    );
  }
  const promoted = subs.find((s) => s.id === campaign.submissionId);
  const artist = artists.find((a) => a.id === campaign.artistId);
  const ready = isListed(promoted);
  const promotedPath = promoted ? `/moderation/${promoted.kind === 'track' ? 'tracks' : 'releases'}/${promoted.id}` : '';
  const details: [string, ReactNode][] = [
    [t('fieldPromoted'), promoted ? (canModeration ? <Link key="p" className="bo-link" to={promotedPath}>{promoted.title}</Link> : promoted.title) : '—'],
    [t('fieldKind'), promoted ? (promoted.kind === 'track' ? t('kindTrack') : t('kindRelease')) : '—'],
    [
      t('fieldPromotedStatus'),
      promoted ? (
        <span key="ps" style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
          <ReviewBadge status={promoted.status} />
          {promoted.status === 'approved' && <ListingBadge status={promoted.listing ?? 'listed'} />}
        </span>
      ) : (
        '—'
      ),
    ],
    [t('fieldArtist'), artist ? (canArtists ? <Link key="a" className="bo-link" to={`/artists/${artist.id}`}>{artist.name}</Link> : artist.name) : '—'],
    [t('fieldTool'), toolName(campaign.toolId)],
    [t('fieldBudget'), budget(campaign)],
    [t('fieldPeriod'), fill(t('periodValue'), { start: day(campaign.startsAt), days: fill(t('days'), { n: campaign.durationDays }) })],
    [t('fieldRegions'), campaign.regions.join(', ')],
    [t('fieldSubmitted'), date(campaign.submittedAt)],
    [t('fieldStatus'), <ReviewBadge key="s" status={campaign.status} />],
    ...(campaign.decidedAt ? ([[t('fieldDecided'), `${date(campaign.decidedAt)} · ${staffName(campaign.decidedBy)}`]] as [string, ReactNode][]) : []),
    ...(campaign.reason ? ([[t('fieldReason'), <p key="r" className="bo-quote" style={{ margin: 0 }}>{campaign.reason}</p>]] as [string, ReactNode][]) : []),
    [t('fieldNote'), l(campaign.pitch)],
  ];

  return (
    <>
      {back}
      <PageHeader
        title={promoted?.title ?? campaign.id}
        subtitle={`${toolName(campaign.toolId)} · ${artist?.name ?? '—'}`}
        actions={
          <>
            <ReviewBadge status={campaign.status} />
            <DemoBadge />
          </>
        }
      />
      <div className="bo-detail-grid">
        <section className="bo-card" aria-label={t('detailsTitle')}>
          <h2>{t('detailsTitle')}</h2>
          <DetailList items={details} />
        </section>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <DecisionPanel
            heading={t('decisionTitle')}
            title={promoted?.title ?? campaign.id}
            status={campaign.status}
            permission="arm.campaigns.decide"
            hint={t('campaignDecisionHint')}
            preview={campaign.status === 'pending' && !ready ? <p className="bo-field-error" style={{ margin: '0 0 12px' }}>{t('campaignNotReady')}</p> : undefined}
            onDecide={(d, r) => actions.decideCampaign(campaign.id, d, r)}
          />
          <section className="bo-card" aria-label={t('campaignResultsTitle')}>
            <h2>{t('campaignResultsTitle')}</h2>
            <PermissionNote icon="insights" text={t('campaignResultsNote')} />
          </section>
        </div>
      </div>
      <section className="bo-section" aria-label={t('historyTitle')}>
        <h2>{t('historyTitle')}</h2>
        <EventTable events={events.filter((e) => e.entity.type === 'campaign' && e.entity.id === campaign.id)} showEntity={false} />
      </section>
    </>
  );
}
