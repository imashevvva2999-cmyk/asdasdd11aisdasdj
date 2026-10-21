import { Link } from 'react-router';

import { useCollection } from '@mmusic/backoffice/react';
import { DemoBadge, PageHeader, PermissionNote } from '@mmusic/backoffice/ui';

import { openFollowUps, sortByDate } from '@/domain/rules';
import type { CrmContact, CrmOrganization, Interaction, RelationshipStatus } from '@/domain/types';
import { fill, ORGANIZATION_KIND_LABELS, type CrmStringKey } from '@/strings';
import { RelationshipBadge, useCrm, useNow } from '@/ui';

const GROUPS: { key: CrmStringKey; statuses: RelationshipStatus[] }[] = [
  { key: 'partnersActive', statuses: ['active'] },
  { key: 'partnersProspective', statuses: ['negotiating', 'prospect'] },
  { key: 'partnersPaused', statuses: ['paused'] },
];

/**
 * Partners (M4): fictional organizations split into active partners, prospective partners (prospect / in talks)
 * and paused relationships. Artist partner profiles wait for OQ-61; no agreement or business data is shown.
 */
export function PartnersPage() {
  const { t, l, date } = useCrm();
  const organizations = useCollection<CrmOrganization>('organizations');
  const contacts = useCollection<CrmContact>('contacts');
  const interactions = useCollection<Interaction>('interactions');
  const now = useNow();

  return (
    <>
      <PageHeader title={t('partnersTitle')} subtitle={t('partnersSubtitle')} actions={<DemoBadge />} />
      <div style={{ marginBottom: 16 }}>
        <PermissionNote icon="info-outline" text={t('partnersNote')} />
      </div>
      <div className="crm-columns">
        {GROUPS.map((g) => {
          const items = organizations.filter((o) => g.statuses.includes(o.relationship)).sort((a, b) => g.statuses.indexOf(a.relationship) - g.statuses.indexOf(b.relationship) || a.name.localeCompare(b.name));
          return (
            <section key={g.key} className="bo-card" aria-label={t(g.key)} data-group={g.key}>
              <div className="bo-card-head">
                <h2 style={{ font: '700 18px/24px "Plus Jakarta Sans", system-ui, sans-serif' }}>{t(g.key)}</h2>
                <span className="bo-muted">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="bo-muted">{t('noPartners')}</p>
              ) : (
                <ul className="crm-partner-list">
                  {items.map((o) => {
                    const own = interactions.filter((i) => i.organizationId === o.id);
                    const follow = openFollowUps(own, now).length;
                    return (
                      <li key={o.id}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <Link className="bo-link" to={`/organizations/${o.id}`}>
                            {o.name}
                          </Link>
                          <RelationshipBadge status={o.relationship} />
                        </span>
                        <span className="bo-muted" style={{ fontSize: 13 }}>
                          {l(ORGANIZATION_KIND_LABELS[o.kind])} · {o.city} · {t('contacts')}: {contacts.filter((c) => c.organizationId === o.id).length}
                        </span>
                        <span className="bo-muted" style={{ fontSize: 12 }}>
                          {t('colLastInteraction')}: {date(sortByDate(own)[0]?.at)}
                          {follow > 0 ? ` · ${fill(t('openFollowUps'), { n: follow })}` : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
