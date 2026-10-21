import { Link } from 'react-router';

import type { ActivityEvent } from '@mmusic/backoffice/domain';
import { formatNumber } from '@mmusic/backoffice/i18n';
import { useCollection } from '@mmusic/backoffice/react';
import { DemoBadge, KpiCard, PageHeader, StatusBadge } from '@mmusic/backoffice/ui';

import { useCrmCan, usePipeline, usePreferences } from '@/access';
import { dealTotals, pipelineByStage } from '@/domain/analytics';
import { crmSummary, sortByDate } from '@/domain/rules';
import { agenda } from '@/domain/tasks';
import type { CrmArtist, CrmContact, CrmOrganization, Deal, Interaction, Task } from '@/domain/types';
import { fill, INTERACTION_KIND_KEYS } from '@/strings';
import { stageTone, useCrm, useNow } from '@/ui';

const cardTitle = { margin: 0, font: '700 18px/24px "Plus Jakarta Sans", system-ui, sans-serif' } as const;

/**
 * CRM dashboard (M4 + M5): the six M4 figures counted from the demo records, the deal pipeline (counts and
 * fictional estimates), open tasks and interaction reminders (overdue first), recent deal changes and recent
 * interactions. Every figure is derived from the records in this browser — the same functions as the analytics.
 */
export function DashboardPage() {
  const { t, locale, date, kgs, auditText, staffName } = useCrm();
  const contacts = useCollection<CrmContact>('contacts');
  const organizations = useCollection<CrmOrganization>('organizations');
  const artists = useCollection<CrmArtist>('artists');
  const interactions = useCollection<Interaction>('interactions');
  const deals = useCollection<Deal>('deals');
  const tasks = useCollection<Task>('tasks');
  const events = useCollection<ActivityEvent>('activity');
  const canContacts = useCrmCan('crm.contacts.view');
  const canOrgs = useCrmCan('crm.organizations.view');
  const canArtists = useCrmCan('crm.artists.view');
  const canPartners = useCrmCan('crm.partners.view');
  const canActivity = useCrmCan('crm.activity.view');
  const canDeals = useCrmCan('crm.deals.view');
  const canTasks = useCrmCan('crm.tasks.view');
  const now = useNow();
  const s = crmSummary({ contacts, organizations, interactions }, now);
  const n = (v: number) => formatNumber(v, locale);
  const link = (to: string, allowed: boolean) => (allowed ? <Link to={to}>{t('viewAll')} →</Link> : undefined);
  const recent = sortByDate(interactions.filter((i) => i.at <= now)).slice(0, 4);
  const items = agenda(tasks, interactions, now);
  const overdue = items.filter((i) => i.overdue).length;
  const who = (i: Interaction) => contacts.find((c) => c.id === i.contactId)?.name ?? artists.find((a) => a.id === i.artistId)?.stageName ?? organizations.find((o) => o.id === i.organizationId)?.name ?? '—';
  const totals = dealTotals(deals);
  const pipeline = usePipeline();
  const prefs = usePreferences();
  const stages = pipelineByStage(deals, pipeline.boardIds);
  const maxCount = Math.max(1, ...stages.map((r) => r.count));
  const dealEvents = [...events].filter((e) => e.entity.type === 'deal').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);

  return (
    <>
      <PageHeader title={t('dashboardTitle')} subtitle={t('dashboardSubtitle')} />
      <section className="bo-section" aria-label={t('dashboardTitle')}>
        <div className="bo-grid">
          <KpiCard icon="contacts" label={t('kpiActiveContacts')} value={`${n(s.activeContacts)} / ${n(s.contacts)}`} hint={t('kpiHint')} demo footer={link('/contacts?status=active', canContacts)} />
          <KpiCard icon="mic" label={t('kpiArtists')} value={n(artists.length)} hint={t('kpiArtistsHint')} demo footer={link('/artists', canArtists)} />
          <KpiCard icon="groups" label={t('kpiOrganizations')} value={n(s.organizations)} hint={t('kpiHint')} demo footer={link('/organizations', canOrgs)} />
          <KpiCard icon="handshake" label={t('kpiActivePartners')} value={n(s.activePartners)} hint={t('kpiHint')} demo footer={link('/partners', canPartners)} />
          <KpiCard icon="person-search" label={t('kpiProspective')} value={n(s.prospective)} hint={t('kpiHint')} demo footer={link('/partners', canPartners)} />
          <KpiCard icon="forum" label={t('kpiInteractions30')} value={n(s.interactions30d)} hint={t('kpiHint')} demo footer={link('/activity', canActivity)} />
          <KpiCard icon="event" label={t('kpiFollowUps')} value={n(s.openFollowUps)} hint={s.overdueFollowUps > 0 ? fill(t('kpiOverdue'), { n: s.overdueFollowUps }) : t('kpiHint')} demo footer={link('/activity?follow=open', canActivity)} />
        </div>
      </section>

      <div className="bo-grid bo-section" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', alignItems: 'start' }}>
        <section className="bo-card" aria-labelledby="crm-pipeline" data-card="pipeline">
          <div className="bo-card-head">
            <h2 id="crm-pipeline" style={cardTitle}>
              {t('pipelineOverview')}
            </h2>
            {canDeals ? (
              <Link className="bo-link" to="/deals" style={{ fontSize: 13 }}>
                {t('viewAll')} →
              </Link>
            ) : (
              <DemoBadge />
            )}
          </div>
          <p className="bo-muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
            {fill(t('pipelineTotals'), { open: totals.open, won: totals.won, lost: totals.lost })} · {fill(t('openEstimateLine'), { sum: kgs(totals.openEstimateKgs) })}
          </p>
          <div className="bo-bars">
            {stages.map((r) => (
              <div key={r.stage} className="bo-bar-row">
                <div className="bo-bar-head">
                  <span>{pipeline.label(r.stage)}</span>
                  <span className="bo-muted">
                    {r.count}
                    {r.estimateKgs ? ` · ${kgs(r.estimateKgs)}` : ''}
                  </span>
                </div>
                <div className="bo-bar" aria-hidden="true">
                  {r.count > 0 && <span className={stageTone(r.stage)} style={{ width: `${(r.count / maxCount) * 100}%` }} />}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bo-card" aria-labelledby="crm-agenda" data-card="agenda">
          <div className="bo-card-head">
            <h2 id="crm-agenda" style={cardTitle}>
              {t('upcomingAgenda')}
            </h2>
            {overdue > 0 ? <StatusBadge tone="danger" label={fill(t('overdueCount'), { n: overdue })} /> : <DemoBadge />}
          </div>
          {items.length === 0 ? (
            <p className="bo-muted">{t('noAgenda')}</p>
          ) : (
            <ul className="bo-list">
              {items.slice(0, prefs.agendaSize).map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <span className="grow">
                    {item.kind === 'task' ? (
                      <Link className="bo-link bo-ellipsis" to={`/tasks/${item.task.id}`} style={{ fontWeight: 600 }}>
                        {item.task.title}
                      </Link>
                    ) : (
                      <span className="bo-ellipsis" style={{ fontWeight: 600 }}>
                        {t('reminderBadge')} · {who(item.interaction)}
                      </span>
                    )}
                    <span className="bo-muted bo-ellipsis" style={{ fontSize: 13 }}>
                      {item.kind === 'task' ? staffName(item.task.assigneeId) : item.interaction.summary}
                    </span>
                  </span>
                  <span className={item.overdue ? 'crm-follow overdue' : 'crm-follow'} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {date(item.due)}
                    {item.overdue ? ` · ${t('followUpOverdue')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canTasks && (
            <Link className="bo-link" to="/tasks" style={{ fontSize: 13 }}>
              {t('viewAll')} →
            </Link>
          )}
        </section>

        <section className="bo-card" aria-labelledby="crm-deal-activity" data-card="deal-activity">
          <div className="bo-card-head">
            <h2 id="crm-deal-activity" style={cardTitle}>
              {t('recentDeals')}
            </h2>
            <DemoBadge />
          </div>
          {dealEvents.length === 0 ? (
            <p className="bo-muted">{t('noDealActivity')}</p>
          ) : (
            <ul className="bo-list">
              {dealEvents.map((e) => (
                <li key={e.id}>
                  <span className="grow">
                    <span className="bo-ellipsis" style={{ fontWeight: 600 }}>
                      {auditText(e.action)}
                      {(e.action === 'deal.stage' || e.action === 'deal.reopen' || e.action === 'deal.create') && e.toStatus ? ` · ${pipeline.label(e.toStatus)}` : ''}
                    </span>
                    {canDeals ? (
                      <Link className="bo-link bo-ellipsis" to={`/deals/${e.entity.id}`} style={{ fontSize: 13 }}>
                        {e.entity.label}
                      </Link>
                    ) : (
                      <span className="bo-muted bo-ellipsis" style={{ fontSize: 13 }}>
                        {e.entity.label}
                      </span>
                    )}
                  </span>
                  <span className="bo-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {date(e.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bo-card" aria-labelledby="crm-recent" data-card="recent">
          <div className="bo-card-head">
            <h2 id="crm-recent" style={cardTitle}>
              {t('recentInteractions')}
            </h2>
            {canActivity && (
              <Link className="bo-link" to="/activity" style={{ fontSize: 13 }}>
                {t('viewAll')} →
              </Link>
            )}
          </div>
          <ul className="bo-list">
            {recent.map((i) => (
              <li key={i.id}>
                <span className="grow">
                  <span className="bo-ellipsis" style={{ fontWeight: 600 }}>
                    {t(INTERACTION_KIND_KEYS[i.kind])} · {who(i)}
                  </span>
                  <span className="bo-muted bo-ellipsis" style={{ fontSize: 13 }}>
                    {i.summary}
                  </span>
                </span>
                <span className="bo-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  {date(i.at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
