import { Link } from 'react-router';

import type { OrganizationKind } from '@mmusic/backoffice/domain';
import { formatNumber } from '@mmusic/backoffice/i18n';
import { useCan, useCollection } from '@mmusic/backoffice/react';
import { DemoBadge, KpiCard, PageHeader } from '@mmusic/backoffice/ui';

import { crmSummary, openFollowUps, sortByDate } from '@/domain/rules';
import type { CrmContact, CrmOrganization, Interaction } from '@/domain/types';
import { fill, INTERACTION_KIND_KEYS, ORGANIZATION_KIND_LABELS } from '@/strings';
import { useCrm, useNow } from '@/ui';

const cardTitle = { margin: 0, font: '700 18px/24px "Plus Jakarta Sans", system-ui, sans-serif' } as const;

/**
 * CRM dashboard (M4): figures counted from the demo records in this browser (contacts, organizations by
 * relationship, interactions in the last 30 days, open follow-ups), recent interactions and upcoming follow-ups.
 * No pipeline, revenue or performance figures — deals and analytics arrive in M5.
 */
export function DashboardPage() {
  const { t, l, locale, date } = useCrm();
  const contacts = useCollection<CrmContact>('contacts');
  const organizations = useCollection<CrmOrganization>('organizations');
  const interactions = useCollection<Interaction>('interactions');
  const canContacts = useCan('crm.contacts.view');
  const canOrgs = useCan('crm.organizations.view');
  const canPartners = useCan('crm.partners.view');
  const canActivity = useCan('crm.activity.view');
  const now = useNow();
  const s = crmSummary({ contacts, organizations, interactions }, now);
  const n = (v: number) => formatNumber(v, locale);
  const link = (to: string, allowed: boolean) => (allowed ? <Link to={to}>{t('viewAll')} →</Link> : undefined);
  const recent = sortByDate(interactions.filter((i) => i.at <= now)).slice(0, 5);
  const follow = openFollowUps(interactions, now).slice(0, 5);
  const who = (i: Interaction) => contacts.find((c) => c.id === i.contactId)?.name ?? organizations.find((o) => o.id === i.organizationId)?.name ?? '—';
  const kinds = Object.entries(organizations.reduce<Partial<Record<OrganizationKind, number>>>((acc, o) => ({ ...acc, [o.kind]: (acc[o.kind] ?? 0) + 1 }), {})) as [OrganizationKind, number][];

  return (
    <>
      <PageHeader title={t('dashboardTitle')} subtitle={t('dashboardSubtitle')} />
      <section className="bo-section" aria-label={t('dashboardTitle')}>
        <div className="bo-grid">
          <KpiCard icon="contacts" label={t('kpiActiveContacts')} value={`${n(s.activeContacts)} / ${n(s.contacts)}`} hint={t('kpiHint')} demo footer={link('/contacts?status=active', canContacts)} />
          <KpiCard icon="business" label={t('kpiOrganizations')} value={n(s.organizations)} hint={t('kpiHint')} demo footer={link('/organizations', canOrgs)} />
          <KpiCard icon="handshake" label={t('kpiActivePartners')} value={n(s.activePartners)} hint={t('kpiHint')} demo footer={link('/partners', canPartners)} />
          <KpiCard icon="person-search" label={t('kpiProspective')} value={n(s.prospective)} hint={t('kpiHint')} demo footer={link('/partners', canPartners)} />
          <KpiCard icon="forum" label={t('kpiInteractions30')} value={n(s.interactions30d)} hint={t('kpiHint')} demo footer={link('/activity', canActivity)} />
          <KpiCard icon="event" label={t('kpiFollowUps')} value={n(s.openFollowUps)} hint={s.overdueFollowUps > 0 ? fill(t('kpiOverdue'), { n: s.overdueFollowUps }) : t('kpiHint')} demo footer={link('/activity?follow=open', canActivity)} />
        </div>
      </section>

      <div className="bo-grid bo-section" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', alignItems: 'start' }}>
        <section className="bo-card" aria-labelledby="crm-follow">
          <div className="bo-card-head">
            <h2 id="crm-follow" style={cardTitle}>
              {t('upcomingFollowUps')}
            </h2>
            <DemoBadge />
          </div>
          {follow.length === 0 ? (
            <p className="bo-muted">{t('noFollowUps')}</p>
          ) : (
            <ul className="bo-list">
              {follow.map(({ interaction: i, overdue }) => (
                <li key={i.id}>
                  <span className="grow">
                    <span className="bo-ellipsis" style={{ fontWeight: 600 }}>
                      {who(i)}
                    </span>
                    <span className="bo-muted bo-ellipsis" style={{ fontSize: 13 }}>
                      {i.summary}
                    </span>
                  </span>
                  <span className={overdue ? 'crm-follow overdue' : 'crm-follow'} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {date(i.followUpAt)}
                    {overdue ? ` · ${t('followUpOverdue')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bo-card" aria-labelledby="crm-recent">
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

        <section className="bo-card" aria-labelledby="crm-kinds">
          <div className="bo-card-head">
            <h2 id="crm-kinds" style={cardTitle}>
              {t('kindsTitle')}
            </h2>
            <DemoBadge />
          </div>
          <ul className="bo-list">
            {kinds.map(([kind, count]) => (
              <li key={kind}>
                <span className="grow">{l(ORGANIZATION_KIND_LABELS[kind])}</span>
                <span className="bo-muted">{n(count)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bo-card" aria-labelledby="crm-roadmap">
          <h2 id="crm-roadmap" style={{ ...cardTitle, marginBottom: 8 }}>
            {t('roadmapTitle')}
          </h2>
          <ul className="bo-list">
            {(['roadmapM5', 'roadmapM6'] as const).map((key) => (
              <li key={key} className="bo-muted">
                {t(key)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
