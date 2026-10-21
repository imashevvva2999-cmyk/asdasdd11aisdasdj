import type { Contact, Organization, OrganizationKind } from '@mmusic/backoffice/domain';
import { formatNumber } from '@mmusic/backoffice/i18n';
import { useCollection, useLocale, useLocalized, useT } from '@mmusic/backoffice/react';
import { DemoBadge, KpiCard, PageHeader } from '@mmusic/backoffice/ui';

import { CRM_STRINGS, ORGANIZATION_KIND_LABELS } from '@/strings';

const cardTitle = { margin: 0, font: '700 18px/24px "Plus Jakarta Sans", system-ui, sans-serif' } as const;

/**
 * CRM dashboard (M1): counts and lists straight from the CRM's mock data source (fictional people and companies,
 * persisted in this browser and restored by "Сбросить демо-данные"), plus the roadmap. Deals, tasks and analytics
 * arrive with their milestones — no invented pipeline figures.
 */
export function DashboardPage() {
  const t = useT(CRM_STRINGS);
  const locale = useLocale();
  const l = useLocalized();
  const contacts = useCollection<Contact>('contacts');
  const organizations = useCollection<Organization>('organizations');
  const orgName = (id?: string) => organizations.find((o) => o.id === id)?.name ?? t('noOrganization');
  const recent = [...contacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const kinds = Object.entries(
    organizations.reduce<Partial<Record<OrganizationKind, number>>>((acc, o) => ({ ...acc, [o.kind]: (acc[o.kind] ?? 0) + 1 }), {}),
  ) as [OrganizationKind, number][];

  return (
    <>
      <PageHeader title={t('dashboardTitle')} subtitle={t('dashboardSubtitle')} />

      <section className="bo-section">
        <div className="bo-grid">
          <KpiCard icon="contacts" label={t('contacts')} value={formatNumber(contacts.length, locale)} hint={t('contactsHint')} demo />
          <KpiCard icon="business" label={t('organizations')} value={formatNumber(organizations.length, locale)} hint={t('organizationsHint')} demo />
        </div>
      </section>

      <div className="bo-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <section className="bo-card" aria-labelledby="crm-recent">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <h2 id="crm-recent" style={cardTitle}>
              {t('recentTitle')}
            </h2>
            <DemoBadge />
          </div>
          <ul className="bo-list">
            {recent.map((contact) => (
              <li key={contact.id}>
                <span className="grow">
                  <span className="bo-ellipsis" style={{ fontWeight: 600 }}>
                    {contact.name}
                  </span>
                  <span className="bo-muted bo-ellipsis" style={{ fontSize: 13 }}>
                    {l(contact.position)} · {orgName(contact.organizationId)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bo-card" aria-labelledby="crm-kinds">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <h2 id="crm-kinds" style={cardTitle}>
              {t('kindsTitle')}
            </h2>
            <DemoBadge />
          </div>
          <ul className="bo-list">
            {kinds.map(([kind, count]) => (
              <li key={kind}>
                <span className="grow">{l(ORGANIZATION_KIND_LABELS[kind])}</span>
                <span className="bo-muted">{formatNumber(count, locale)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bo-card" aria-labelledby="crm-roadmap">
          <h2 id="crm-roadmap" style={{ ...cardTitle, marginBottom: 8 }}>
            {t('roadmapTitle')}
          </h2>
          <ul className="bo-list">
            {(['roadmapM4', 'roadmapM5', 'roadmapM6'] as const).map((key) => (
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
